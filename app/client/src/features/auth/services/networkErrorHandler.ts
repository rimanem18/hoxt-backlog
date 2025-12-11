/**
 * ネットワークエラーハンドリングと自動リトライ機能。
 * 指数バックオフによる自動リトライとエラー分類を提供する。
 */

/**
 * ネットワークエラーの型定義
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
 * ネットワークエラー分類・自動リトライ・遅延管理を担う。
 * 指数バックオフによる自動リトライとスケジュール管理を行う。
 */
export class NetworkErrorHandler {
  private retryConfig: RetryConfig;
  private currentRetryCount: number = 0;
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();

  /**
   * NetworkErrorHandlerを初期化する
   * @param config - リトライ設定（オプション）
   */
  constructor(config?: RetryConfig) {
    // 合理的なデフォルト値を設定
    this.retryConfig = config || {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      initialDelay: 1000,
    };
  }

  /**
   * ネットワークエラーを処理してリトライ判定を行う
   * @param error - ネットワークエラー情報
   * @returns エラーハンドリング結果
   */
  handleNetworkError(error: NetworkError): NetworkErrorHandleResult {
    // エラータイプとリトライ回数によるリトライ判定
    const shouldRetry =
      error.retryable &&
      error.type === 'temporary' &&
      this.currentRetryCount < this.retryConfig.maxRetries;

    if (shouldRetry) {
      this.currentRetryCount++;

      // 指数バックオフによる遅延時間計算
      const delay = this.calculateBackoffDelay(this.currentRetryCount);

      return {
        willRetry: true,
        retryCount: this.currentRetryCount,
        nextRetryDelay: delay,
        userMessage: `接続中です... (${this.currentRetryCount}/${this.retryConfig.maxRetries})`,
        severity: 'info',
      };
    } else {
      // 最大回数到達または永続的エラーのためリトライ不可
      return {
        willRetry: false,
        retryCount: this.currentRetryCount,
        nextRetryDelay: 0,
        userMessage: 'インターネット接続を確認してください。',
        severity: 'error',
      };
    }
  }

  /**
   * 指数バックオフによる遅延時間を計算する
   * @param retryCount - 現在のリトライ回数
   * @returns 次回リトライまでの遅延時間（ミリ秒）
   */
  private calculateBackoffDelay(retryCount: number): number {
    return Math.floor(
      this.retryConfig.initialDelay *
        this.retryConfig.backoffMultiplier ** (retryCount - 1),
    );
  }

  /**
   * 指定遅延後のリトライ処理をスケジュールする
   * @param delay - リトライまでの遅延時間（ミリ秒）
   * @param retryCallback - リトライ時に実行するコールバック関数
   */
  scheduleRetry(delay: number, retryCallback: () => void): void {
    const timeoutId = setTimeout(() => {
      // 完了したタイムアウトをセットから除去
      this.retryTimeouts.delete(timeoutId);
      retryCallback();
    }, delay);

    // キャンセル可能にするためタイムアウトIDを保存
    this.retryTimeouts.add(timeoutId);
  }

  /**
   * 成功時にリトライ状態をリセットする
   */
  resetRetryCount(): void {
    this.currentRetryCount = 0;

    // スケジュール済みリトライを全てキャンセル
    for (const timeoutId of this.retryTimeouts) {
      clearTimeout(timeoutId);
    }
    this.retryTimeouts.clear();
  }

  /**
   * ネットワークエラーを種別判定する
   * @param error - エラー情報
   * @returns 分類済みネットワークエラー
   */
  classifyNetworkError(error: unknown): NetworkError {
    // エラーオブジェクトの型安全なチェック
    const errorObj = error as {
      status?: number;
      message?: string;
      code?: string;
    };

    // HTTPステータスコードに基づくエラー分類
    if (typeof errorObj.status === 'number' && errorObj.status >= 500) {
      return {
        code: 'server_error',
        message: errorObj.message || 'Server error occurred',
        type: 'temporary',
        retryable: true,
      };
    } else if (typeof errorObj.status === 'number' && errorObj.status >= 400) {
      return {
        code: 'client_error',
        message: errorObj.message || 'Client error occurred',
        type: 'permanent',
        retryable: false,
      };
    } else if (
      (error as unknown as { code?: string; name?: string })?.code ===
        'NETWORK_ERROR' ||
      (error as unknown as { code?: string; name?: string })?.name ===
        'NetworkError'
    ) {
      return {
        code: 'network_error',
        message: 'Network connection failed',
        type: 'temporary',
        retryable: true,
      };
    } else {
      return {
        code: 'unknown_error',
        message:
          (error as unknown as { message?: string })?.message ||
          'Unknown network error',
        type: 'temporary',
        retryable: true,
      };
    }
  }

  /**
   * 現在のリトライ状態情報を取得する
   * @returns リトライ統計情報
   */
  getRetryStats() {
    return {
      currentRetryCount: this.currentRetryCount,
      maxRetries: this.retryConfig.maxRetries,
      pendingRetries: this.retryTimeouts.size,
      config: { ...this.retryConfig },
    };
  }
}
