/**
 * 【機能概要】: API接続失敗時のフォールバック・オフライン対応機能を提供するサービスクラス
 * 【実装方針】: errorHandling.test.ts のテストケースを通すために必要な機能を実装
 * 【テスト対応】: バックエンドAPI接続失敗・ローカルキャッシュ利用・オフラインモード・接続リトライ
 * 🔴 信頼性レベル: 元資料にないオフライン対応・フォールバック機能を推測実装
 */

import { User } from '@/packages/shared-schemas/src/auth';

/**
 * API接続エラーの型定義
 * 【型定義】: バックエンドAPI接続失敗時のエラー情報
 */
interface APIConnectionError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** HTTPステータスコード */
  statusCode: number;
  /** 失敗したエンドポイント */
  endpoint: string;
}

/**
 * キャッシュされたユーザーデータの型定義
 * 【型定義】: ローカルキャッシュに保存されたユーザー情報
 */
interface CachedUserData {
  /** ユーザー情報 */
  user: User;
  /** キャッシュ作成時刻 */
  cachedAt: number;
  /** キャッシュ有効性フラグ */
  isValid: boolean;
}

/**
 * APIフォールバック処理結果の型定義
 * 【型定義】: API失敗時のフォールバック処理結果情報
 */
interface APIFallbackResult {
  /** キャッシュ使用フラグ */
  useCache: boolean;
  /** 取得されたユーザーデータ */
  userData: User | null;
  /** オフラインモード有効フラグ */
  offlineMode: boolean;
  /** ユーザー向けメッセージ */
  userMessage: string;
  /** データの信頼性レベル */
  reliability: 'fresh' | 'cached' | 'stale' | 'unavailable';
}

/**
 * 接続リトライ設定の型定義
 * 【型定義】: API接続リトライの設定パラメータ
 */
interface RetryConnectionConfig {
  /** リトライ間隔（ミリ秒） */
  interval: number;
  /** 最大リトライ回数 */
  maxAttempts: number;
  /** バックオフ有効フラグ */
  useBackoff: boolean;
}

/**
 * 【APIFallbackHandlerクラス】: API失敗時のフォールバック・キャッシュ利用・オフライン対応機能の実装
 * 【実装内容】: ローカルキャッシュ管理・オフラインモード・接続リトライスケジューリング
 * 【テスト要件対応】: errorHandling.test.ts のAPI接続失敗関連テストケースに対応
 * 🔴 信頼性レベル: テストケースから推測したオフライン対応機能
 */
export class APIFallbackHandler {
  private retryTimers: Set<NodeJS.Timeout> = new Set();
  private isOfflineMode: boolean = false;
  private connectionCheckInterval?: NodeJS.Timeout;

  /**
   * 【API失敗フォールバック処理】: API接続失敗時のキャッシュ利用とオフラインモード切り替え
   * 【実装内容】: エラー分析・キャッシュ有効性確認・オフラインモード有効化
   * 【テスト要件対応】: "バックエンドAPI接続失敗時のフォールバック処理" テストケース
   * 🔴 信頼性レベル: テストケースから推測したフォールバック実装
   * @param error - API接続エラー情報
   * @param cachedData - 利用可能なキャッシュデータ
   * @returns {APIFallbackResult} - フォールバック処理結果
   */
  handleAPIFailure(error: APIConnectionError, cachedData?: CachedUserData): APIFallbackResult {
    // 【エラー分析】: 一時的 vs 永続的エラーの判定
    const isTemporaryError = this.isTemporaryError(error);
    
    if (cachedData && cachedData.isValid) {
      // 【キャッシュ利用】: 有効なキャッシュがある場合の処理
      this.enableOfflineMode();
      
      return {
        useCache: true,
        userData: cachedData.user,
        offlineMode: true,
        userMessage: 'オフラインモードで動作中です。接続が回復すると自動的に同期されます。',
        reliability: this.getCacheReliability(cachedData.cachedAt)
      };
    }
    
    // 【キャッシュなし】: 利用可能なキャッシュがない場合
    this.enableOfflineMode();
    
    return {
      useCache: false,
      userData: null,
      offlineMode: true,
      userMessage: 'サーバーに接続できません。インターネット接続を確認してください。',
      reliability: 'unavailable'
    };
  }

  /**
   * 【エラータイプ判定】: API接続エラーの一時性判定
   * 【実装内容】: HTTPステータスコードとエラーコードに基づくエラー分類
   * 【判定基準】: 5xx系は一時的、4xx系は永続的、ネットワークエラーは一時的
   * 🔴 信頼性レベル: HTTP標準とネットワークエラーパターンから推測
   * @param error - API接続エラー
   * @returns {boolean} - 一時的エラーかどうか
   */
  private isTemporaryError(error: APIConnectionError): boolean {
    // 【HTTPステータス判定】
    if (error.statusCode >= 500) return true; // サーバーエラーは一時的
    if (error.statusCode === 0) return true;  // ネットワークエラーは一時的
    if (error.statusCode === 408) return true; // タイムアウトは一時的
    if (error.statusCode === 429) return true; // レート制限は一時的
    
    // 【エラーコード判定】
    if (error.code === 'api_connection_failed') return true;
    if (error.code === 'network_timeout') return true;
    
    return false; // その他は永続的エラーとして扱う
  }

  /**
   * 【オフラインモード有効化】: オフラインモードの状態管理と接続監視開始
   * 【実装内容】: オフラインフラグ設定・接続回復監視開始
   * 【自動回復】: 定期的な接続確認による自動オンライン復帰
   * 🔴 信頼性レベル: オフライン対応の一般的なパターンから推測
   */
  private enableOfflineMode(): void {
    this.isOfflineMode = true;
    
    // 【接続監視開始】: 定期的な接続確認でオンライン復帰を検出
    if (!this.connectionCheckInterval) {
      this.startConnectionMonitoring();
    }
  }

  /**
   * 【キャッシュ信頼性判定】: キャッシュデータの新しさに基づく信頼性レベル判定
   * 【実装内容】: キャッシュ作成時刻から信頼性レベルを算出
   * 【判定基準】: 5分以内→fresh、30分以内→cached、それ以上→stale
   * 🔴 信頼性レベル: キャッシュ管理の一般的なパターンから推測
   * @param cachedAt - キャッシュ作成時刻
   * @returns {string} - 信頼性レベル
   */
  private getCacheReliability(cachedAt: number): 'fresh' | 'cached' | 'stale' {
    const ageInMinutes = (Date.now() - cachedAt) / (1000 * 60);
    
    if (ageInMinutes <= 5) return 'fresh';      // 5分以内は新鮮
    if (ageInMinutes <= 30) return 'cached';    // 30分以内はキャッシュ
    return 'stale';                             // それ以上は古いデータ
  }

  /**
   * 【接続リトライスケジューリング】: API接続回復の定期的な試行
   * 【実装内容】: 指数バックオフによる接続リトライスケジューリング
   * 【テスト要件対応】: scheduleRetryConnection機能の存在確認テスト
   * 🔴 信頼性レベル: テストケースから機能存在を確認
   * @param config - リトライ設定
   * @param retryCallback - リトライ時のコールバック関数
   */
  scheduleRetryConnection(
    config: RetryConnectionConfig = { interval: 30000, maxAttempts: 10, useBackoff: true },
    retryCallback?: () => Promise<boolean>
  ): void {
    let attemptCount = 0;
    
    const attemptReconnection = () => {
      if (attemptCount >= config.maxAttempts) {
        console.log('最大リトライ回数に達しました');
        return;
      }
      
      attemptCount++;
      
      // 【接続テスト】: 簡易的な接続確認
      this.testConnection()
        .then(isConnected => {
          if (isConnected) {
            // 【接続回復】: オフラインモード解除
            this.disableOfflineMode();
            if (retryCallback) retryCallback();
          } else {
            // 【接続失敗】: 次回リトライをスケジュール
            const delay = config.useBackoff ? 
              config.interval * Math.pow(2, attemptCount - 1) : 
              config.interval;
              
            const timerId = setTimeout(attemptReconnection, delay);
            this.retryTimers.add(timerId);
          }
        })
        .catch(() => {
          // 【リトライ継続】: エラーが発生した場合も継続
          const delay = config.useBackoff ? 
            config.interval * Math.pow(2, attemptCount - 1) : 
            config.interval;
            
          const timerId = setTimeout(attemptReconnection, delay);
          this.retryTimers.add(timerId);
        });
    };
    
    // 【初回リトライ開始】
    const timerId = setTimeout(attemptReconnection, config.interval);
    this.retryTimers.add(timerId);
  }

  /**
   * 【接続テスト】: API接続の可用性確認
   * 【実装内容】: 軽量なヘルスチェックエンドポイントへのリクエスト
   * 【パフォーマンス配慮】: 短いタイムアウトでの接続確認
   * 🔴 信頼性レベル: 接続監視の一般的なパターンから推測
   * @returns {Promise<boolean>} - 接続可能性
   */
  private async testConnection(): Promise<boolean> {
    try {
      // 【軽量接続テスト】: 簡単なフェッチリクエストで接続確認
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 【接続監視開始】: 定期的な接続状態確認の開始
   * 【実装内容】: setIntervalによる定期的な接続確認
   * 【監視間隔】: 30秒間隔での接続確認
   * 🔴 信頼性レベル: 定期監視の一般的なパターンから推測
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(async () => {
      if (this.isOfflineMode) {
        const isConnected = await this.testConnection();
        if (isConnected) {
          this.disableOfflineMode();
        }
      }
    }, 30000); // 30秒間隔
  }

  /**
   * 【オフラインモード解除】: オンライン復帰時の状態クリア
   * 【実装内容】: オフラインフラグクリア・監視タイマー停止
   * 🔴 信頼性レベル: オフライン対応の一般的なパターンから推測
   */
  private disableOfflineMode(): void {
    this.isOfflineMode = false;
    
    // 【監視停止】: 接続監視タイマーの停止
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = undefined;
    }
    
    // 【リトライタイマークリア】: 保留中のリトライタイマーを全て停止
    this.retryTimers.forEach(timerId => clearTimeout(timerId));
    this.retryTimers.clear();
    
    console.log('オンラインモードに復帰しました');
  }

  /**
   * 【オフライン状態取得】: 現在のオフラインモード状態を取得
   * 【実装内容】: 現在のモード状態の返却
   * @returns {boolean} - オフラインモード状態
   */
  isInOfflineMode(): boolean {
    return this.isOfflineMode;
  }

  /**
   * 【フォールバックハンドラー停止】: 全てのタイマーと監視を停止
   * 【実装内容】: リソースクリーンアップ・メモリリーク防止
   * 🔴 信頼性レベル: リソース管理の一般的なパターン
   */
  dispose(): void {
    this.disableOfflineMode();
  }
}