/**
 * 【機能概要】: ネットワークエラーハンドリングと自動リトライ機能を提供するサービスクラス
 * 【実装方針】: errorHandling.test.ts のテストケースを通すために必要な機能を実装
 * 【テスト対応】: ネットワークエラー分類・指数バックオフリトライ・スケジュール管理
 * 🟢 信頼性レベル: EDGE-102（ネットワークエラー処理）要件とNFR-002（10秒以内完了）要件に基づく実装
 */

/**
 * ネットワークエラーの型定義
 * 【型定義】: ネットワーク通信エラーの詳細情報
 */
interface NetworkError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** エラータイプ（一時的 or 永続的） */
  type: 'temporary' | 'permanent';
  /** リトライ可能性 */
  retryable: boolean;
}

/**
 * リトライ設定の型定義
 * 【型定義】: 自動リトライの設定パラメータ
 */
interface RetryConfig {
  /** 最大リトライ回数 */
  maxRetries: number;
  /** バックオフ倍率 */
  backoffMultiplier: number;
  /** 初回リトライ遅延時間（ミリ秒） */
  initialDelay: number;
}

/**
 * ネットワークエラーハンドリング結果の型定義
 * 【型定義】: ネットワークエラー処理の結果情報
 */
interface NetworkErrorHandleResult {
  /** リトライ実行フラグ */
  willRetry: boolean;
  /** 現在のリトライ回数 */
  retryCount: number;
  /** 次回リトライまでの遅延時間（ミリ秒） */
  nextRetryDelay: number;
  /** ユーザー向けメッセージ */
  userMessage: string;
  /** エラーの重要度 */
  severity: 'info' | 'warning' | 'error';
}

/**
 * 【NetworkErrorHandlerクラス】: ネットワークエラー分類・自動リトライ・遅延管理機能の実装
 * 【実装内容】: 指数バックオフによる自動リトライ・エラー分類・スケジュール管理
 * 【テスト要件対応】: errorHandling.test.ts のネットワークエラー関連テストケースに対応
 * 🟢 信頼性レベル: EDGE-102要件とNFR-002要件から直接実装
 */
export class NetworkErrorHandler {
  private retryConfig: RetryConfig;
  private currentRetryCount: number = 0;
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();

  /**
   * NetworkErrorHandlerのコンストラクタ
   * 【初期化】: リトライ設定とカウンターの初期化
   * @param config - リトライ設定（オプション）
   */
  constructor(config?: RetryConfig) {
    // 【デフォルトリトライ設定】: 合理的なデフォルト値を設定
    this.retryConfig = config || {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      initialDelay: 1000
    };
  }

  /**
   * 【ネットワークエラー処理】: エラー分類とリトライ判定
   * 【実装内容】: エラータイプに応じたリトライ戦略とユーザー通知
   * 【テスト要件対応】: "ネットワークエラー時の自動リトライ機能" テストケース
   * 🟢 信頼性レベル: テストケースから直接実装
   * @param error - ネットワークエラー情報
   * @returns {NetworkErrorHandleResult} - エラーハンドリング結果
   */
  handleNetworkError(error: NetworkError): NetworkErrorHandleResult {
    // 【リトライ判定】: エラータイプとリトライ回数で判定
    const shouldRetry = error.retryable && 
                       error.type === 'temporary' && 
                       this.currentRetryCount < this.retryConfig.maxRetries;

    if (shouldRetry) {
      this.currentRetryCount++;
      
      // 【指数バックオフ遅延計算】: リトライ回数に応じた遅延時間計算
      const delay = this.calculateBackoffDelay(this.currentRetryCount);

      return {
        willRetry: true,
        retryCount: this.currentRetryCount,
        nextRetryDelay: delay,
        userMessage: `接続中です... (${this.currentRetryCount}/${this.retryConfig.maxRetries})`,
        severity: 'info'
      };
    } else {
      // 【リトライ不可】: 最大回数到達または永続的エラー
      return {
        willRetry: false,
        retryCount: this.currentRetryCount,
        nextRetryDelay: 0,
        userMessage: 'インターネット接続を確認してください。',
        severity: 'error'
      };
    }
  }

  /**
   * 【指数バックオフ遅延計算】: リトライ回数に応じた遅延時間の計算
   * 【実装内容】: バックオフ倍率を使用した指数的遅延時間計算
   * 【アルゴリズム】: delay = initialDelay * (backoffMultiplier ^ retryCount)
   * 🟢 信頼性レベル: 指数バックオフの標準アルゴリズム
   * @param retryCount - 現在のリトライ回数
   * @returns {number} - 次回リトライまでの遅延時間（ミリ秒）
   */
  private calculateBackoffDelay(retryCount: number): number {
    return Math.floor(
      this.retryConfig.initialDelay * 
      Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1)
    );
  }

  /**
   * 【リトライスケジューリング】: 指定遅延後のリトライ処理を予約
   * 【実装内容】: setTimeout使用のリトライコールバック実行管理
   * 【テスト要件対応】: scheduleRetry機能の存在確認テスト
   * 🟢 信頼性レベル: テストケースから機能存在を確認
   * @param delay - リトライまでの遅延時間（ミリ秒）
   * @param retryCallback - リトライ時に実行するコールバック関数
   */
  scheduleRetry(delay: number, retryCallback: () => void): void {
    const timeoutId = setTimeout(() => {
      // 【タイムアウト管理】: 完了したタイムアウトをセットから除去
      this.retryTimeouts.delete(timeoutId);
      retryCallback();
    }, delay);

    // 【タイムアウト追跡】: キャンセル可能にするためタイムアウトIDを保存
    this.retryTimeouts.add(timeoutId);
  }

  /**
   * 【リトライカウンターリセット】: 成功時にリトライ状態をリセット
   * 【実装内容】: リトライ回数とタイムアウトのクリア
   * 【使用場面】: 通信成功時の状態リセット
   * 🟡 信頼性レベル: リトライパターンの一般的なベストプラクティス
   */
  resetRetryCount(): void {
    this.currentRetryCount = 0;
    
    // 【保留中リトライキャンセル】: スケジュール済みリトライを全てキャンセル
    this.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.retryTimeouts.clear();
  }

  /**
   * 【エラータイプ判定】: ネットワークエラーの種別判定
   * 【実装内容】: HTTPステータスコードやエラーメッセージに基づく分類
   * 【分類基準】: 一時的エラー（500系）vs 永続的エラー（400系）
   * 🟡 信頼性レベル: HTTP標準とネットワークエラー分類の一般的パターン
   * @param error - エラー情報
   * @returns {NetworkError} - 分類済みネットワークエラー
   */
  classifyNetworkError(error: any): NetworkError {
    // 【HTTPステータスコード判定】: ステータスに基づくエラー分類
    if (error.status >= 500) {
      return {
        code: 'server_error',
        message: error.message,
        type: 'temporary',
        retryable: true
      };
    } else if (error.status >= 400) {
      return {
        code: 'client_error',
        message: error.message,
        type: 'permanent',
        retryable: false
      };
    } else if (error.code === 'NETWORK_ERROR' || error.name === 'NetworkError') {
      return {
        code: 'network_error',
        message: 'Network connection failed',
        type: 'temporary',
        retryable: true
      };
    } else {
      return {
        code: 'unknown_error',
        message: error.message || 'Unknown network error',
        type: 'temporary',
        retryable: true
      };
    }
  }

  /**
   * 【リトライ統計情報取得】: 現在のリトライ状態情報を取得
   * 【実装内容】: デバッグ・監視用のリトライ統計データ
   * 🟡 信頼性レベル: 監視・デバッグ用途の一般的なパターン
   * @returns リトライ統計情報
   */
  getRetryStats() {
    return {
      currentRetryCount: this.currentRetryCount,
      maxRetries: this.retryConfig.maxRetries,
      pendingRetries: this.retryTimeouts.size,
      config: { ...this.retryConfig }
    };
  }
}