/**
 * エラーハンドリング共通サービス
 * エラー処理の共通化とユーザーフレンドリーなメッセージ提供
 */

/**
 * 技術的詳細を隠したユーザー向けエラー情報
 */
export interface UserFriendlyError {
  /** ユーザー向けの分かりやすいエラーメッセージ */
  message: string;
  /** エラーの種別（UI表示制御用） */
  type: 'network' | 'authentication' | 'server' | 'validation' | 'unknown';
  /** エラーの深刻度レベル */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 推奨されるユーザーアクション */
  action?: 'retry' | 'login' | 'contact_support' | 'none';
  /** 元のエラー情報（開発・デバッグ用） */
  originalError?: unknown;
}

/**
 * 様々なエラーをユーザーフレンドリーな形に変換するサービス
 */

/**
 * HTTPステータスコードに応じたエラー変換
 */
function handleHttpError(
  status: number,
  _statusText: string,
): UserFriendlyError {
  switch (status) {
    case 401:
      return {
        message: '認証が必要です。再度ログインしてください',
        type: 'authentication',
        severity: 'high',
        action: 'login',
      };

    case 403:
      return {
        message: 'この操作を実行する権限がありません',
        type: 'authentication',
        severity: 'medium',
        action: 'contact_support',
      };

    case 404:
      return {
        message: '要求されたリソースが見つかりません',
        type: 'server',
        severity: 'low',
        action: 'retry',
      };

    case 429:
      return {
        message: 'リクエストが多すぎます。しばらく待ってから再試行してください',
        type: 'server',
        severity: 'medium',
        action: 'retry',
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: 'プロフィール情報の取得に失敗しました',
        type: 'server',
        severity: 'medium',
        action: 'retry',
      };

    default:
      return {
        message: `サーバーエラーが発生しました（${status}）`,
        type: 'server',
        severity: 'medium',
        action: 'retry',
      };
  }
}

/**
 * 通信障害エラーのユーザーフレンドリー変換
 */
function handleNetworkError(error: Error): UserFriendlyError {
  // 一般的なネットワークエラーパターンの判定
  const isNetworkError =
    error instanceof TypeError ||
    error.message.includes('fetch') ||
    error.message.includes('Network Error') ||
    error.message.includes('NETWORK_ERROR');

  if (isNetworkError) {
    return {
      message: 'インターネット接続を確認してください',
      type: 'network',
      severity: 'high',
      action: 'retry',
      originalError: error,
    };
  }

  // 未分類エラーのフォールバック
  return {
    message: '通信エラーが発生しました',
    type: 'network',
    severity: 'medium',
    action: 'retry',
    originalError: error,
  };
}

/**
 * 認証関連エラーの統一処理
 */
function handleAuthError(message: string): UserFriendlyError {
  if (message.includes('トークンが見つかりません')) {
    return {
      message: '認証情報が見つかりません。ログインしてください',
      type: 'authentication',
      severity: 'high',
      action: 'login',
    };
  }

  if (message.includes('有効期限')) {
    return {
      message: '認証の有効期限が切れました。再度ログインしてください',
      type: 'authentication',
      severity: 'high',
      action: 'login',
    };
  }

  // 汎用認証エラー
  return {
    message: '認証エラーが発生しました。再度ログインしてください',
    type: 'authentication',
    severity: 'high',
    action: 'login',
  };
}

/**
 * 未分類エラーの安全な処理
 */
function handleUnknownError(error: unknown): UserFriendlyError {
  // Error型の場合
  if (error instanceof Error) {
    // ネットワーク関連エラーの優先判定
    if (
      error.message === 'Network Error' ||
      error.message.includes('接続') ||
      error.message.includes('ネットワーク') ||
      (error instanceof TypeError && error.message.includes('fetch'))
    ) {
      return handleNetworkError(error);
    }

    // 認証関連エラーの判定
    if (error.message.includes('認証') || error.message.includes('トークン')) {
      return handleAuthError(error.message);
    }
  }

  // 完全フォールバック
  return {
    message:
      '予期しないエラーが発生しました。しばらく待ってから再試行してください',
    type: 'unknown',
    severity: 'medium',
    action: 'retry',
    originalError: error,
  };
}

/**
 * あらゆるエラーを適切に変換する統一エントリーポイント
 */
function handle(error: unknown): UserFriendlyError {
  try {
    // Response型エラーの場合（fetch APIエラー）
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const httpError = error as { status: number; statusText: string };
      return handleHttpError(httpError.status, httpError.statusText);
    }

    // Error型の場合
    if (error instanceof Error) {
      return handleUnknownError(error);
    }

    // 文字列エラーの場合
    if (typeof error === 'string') {
      return handleUnknownError(new Error(error));
    }

    // その他の型の場合
    return handleUnknownError(error);
  } catch (handlingError) {
    // エラーハンドリング自体でエラーが発生した場合の最終フォールバック
    console.error('エラーハンドリング中にエラーが発生:', handlingError);
    return {
      message: 'システムエラーが発生しました',
      type: 'unknown',
      severity: 'critical',
      action: 'contact_support',
      originalError: error,
    };
  }
}

/**
 * 統一されたエラーハンドリングサービス
 * @example const userError = errorService.handle(apiError);
 */
export const errorService = {
  handleHttpError,
  handleNetworkError,
  handleAuthError,
  handleUnknownError,
  handle,
};
