/**
 * API接続失敗時のフォールバック・オフライン対応機能。
 * キャッシュデータの利用と自動接続回復を提供する。
 */

import type { User } from '@/packages/shared-schemas/src/auth';

/**
 * API接続エラーの型定義
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
 * API失敗時のフォールバック・キャッシュ利用・オフライン対応を担う。
 * ローカルキャッシュ管理と接続リトライスケジューリングを行う。
 */
export class APIFallbackHandler {
  private retryTimers: Set<NodeJS.Timeout> = new Set();
  private isOfflineMode: boolean = false;
  private connectionCheckInterval?: NodeJS.Timeout;

  /**
   * API接続失敗時のフォールバック処理を実行する
   * @param error - API接続エラー情報
   * @param cachedData - 利用可能なキャッシュデータ
   * @returns フォールバック処理結果
   */
  handleAPIFailure(
    _error: APIConnectionError,
    cachedData?: CachedUserData,
  ): APIFallbackResult {
    // 一時的エラーか永続的エラーかを判定（現在未使用だが将来的にリトライ機能で活用予定）
    // const isTemporaryError = this.isTemporaryError(error);

    if (cachedData?.isValid) {
      // 有効なキャッシュを使用してオフラインモードで動作
      this.enableOfflineMode();

      return {
        useCache: true,
        userData: cachedData.user,
        offlineMode: true,
        userMessage:
          'オフラインモードで動作中です。接続が回復すると自動的に同期されます。',
        reliability: this.getCacheReliability(cachedData.cachedAt),
      };
    }

    // 利用可能なキャッシュがない場合
    this.enableOfflineMode();

    return {
      useCache: false,
      userData: null,
      offlineMode: true,
      userMessage:
        'サーバーに接続できません。インターネット接続を確認してください。',
      reliability: 'unavailable',
    };
  }

  /**
   * オフラインモードを有効化して接続監視を開始する
   */
  private enableOfflineMode(): void {
    this.isOfflineMode = true;

    // 定期的な接続確認でオンライン復帰を検出
    if (!this.connectionCheckInterval) {
      this.startConnectionMonitoring();
    }
  }

  /**
   * キャッシュデータの信頼性レベルを判定する
   * @param cachedAt - キャッシュ作成時刻
   * @returns 信頼性レベル
   */
  private getCacheReliability(cachedAt: number): 'fresh' | 'cached' | 'stale' {
    const ageInMinutes = (Date.now() - cachedAt) / (1000 * 60);

    if (ageInMinutes <= 5) return 'fresh'; // 5分以内は新鮮
    if (ageInMinutes <= 30) return 'cached'; // 30分以内はキャッシュ
    return 'stale'; // それ以上は古いデータ
  }

  /**
   * API接続回復のリトライをスケジュールする
   * @param config - リトライ設定
   * @param retryCallback - リトライ時のコールバック関数
   */
  scheduleRetryConnection(
    config: RetryConnectionConfig = {
      interval: 30000,
      maxAttempts: 10,
      useBackoff: true,
    },
    retryCallback?: () => Promise<boolean>,
  ): void {
    let attemptCount = 0;

    const attemptReconnection = () => {
      if (attemptCount >= config.maxAttempts) {
        console.log('最大リトライ回数に達しました');
        return;
      }

      attemptCount++;

      // 簡易的な接続確認でテスト
      this.testConnection()
        .then((isConnected) => {
          if (isConnected) {
            // 接続回復時のオフラインモード解除
            this.disableOfflineMode();
            if (retryCallback) retryCallback();
          } else {
            // 接続失敗時は次回リトライをスケジュール
            const delay = config.useBackoff
              ? config.interval * 2 ** (attemptCount - 1)
              : config.interval;

            const timerId = setTimeout(attemptReconnection, delay);
            this.retryTimers.add(timerId);
          }
        })
        .catch(() => {
          // エラーが発生した場合もリトライ継続
          const delay = config.useBackoff
            ? config.interval * 2 ** (attemptCount - 1)
            : config.interval;

          const timerId = setTimeout(attemptReconnection, delay);
          this.retryTimers.add(timerId);
        });
    };

    // 初回リトライを開始
    const timerId = setTimeout(attemptReconnection, config.interval);
    this.retryTimers.add(timerId);
  }

  /**
   * API接続の可用性をテストする
   * @returns 接続可能性
   */
  private async testConnection(): Promise<boolean> {
    try {
      // 簡単なフェッチリクエストで接続確認
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 定期的な接続状態監視を開始する
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
   * オンライン復帰時にオフラインモードを解除する
   */
  private disableOfflineMode(): void {
    this.isOfflineMode = false;

    // 接続監視タイマーを停止
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = undefined;
    }

    // 保留中のリトライタイマーを全て停止
    this.retryTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.retryTimers.clear();

    console.log('オンラインモードに復帰しました');
  }

  /**
   * 現在のオフラインモード状態を取得する
   * @returns オフラインモード状態
   */
  isInOfflineMode(): boolean {
    return this.isOfflineMode;
  }

  /**
   * 全てのタイマーと監視を停止してリソースを解放する
   */
  dispose(): void {
    this.disableOfflineMode();
  }
}
