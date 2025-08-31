/**
 * 認証エラーハンドリングサービス。
 * ユーザーフレンドリーなエラー処理と国際化対応を提供する。
 */

/**
 * 認証キャンセルエラーの型定義
 */
interface AuthCancelledError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 認証プロバイダー */
  provider: string;
}

/**
 * 認証エラーハンドリング結果の型定義
 */
interface AuthErrorHandleResult {
  /** エラーメッセージを表示するかどうか */
  shouldShowError: boolean;
  /** ユーザー向けメッセージ */
  userMessage: string;
  /** 再試行可能かどうか */
  canRetry: boolean;
  /** エラーの重要度 */
  severity?: 'info' | 'warning' | 'error';
}

/**
 * 認証エラーの分類・処理・ユーザー通知を担う。
 * エラー種別の判定とユーザーフレンドリーなメッセージ変換を行う。
 */
export class AuthErrorHandler {

  /**
   * 認証キャンセルエラーを処理する
   * @param error - 認証キャンセルエラー情報
   * @returns エラーハンドリング結果
   */
  handleAuthCancellation(error: AuthCancelledError): AuthErrorHandleResult {
    // キャンセルは正常な操作として扱い、ユーザビリティを重視
    return {
      shouldShowError: false, // エラーメッセージは表示しない
      userMessage: '認証をキャンセルしました。',
      canRetry: true, // キャンセル後の再認証は可能
      severity: 'info' // 情報レベルの通知
    };
  }

  /**
   * 認証エラーを分類して適切に処理する
   * @param error - 認証エラー情報
   * @returns エラーハンドリング結果
   */
  handleAuthError(error: any): AuthErrorHandleResult {
    // エラーコード別の分類処理
    switch (error.code) {
      case 'auth_cancelled':
        return this.handleAuthCancellation(error);
      
      case 'popup_blocked':
        return {
          shouldShowError: true,
          userMessage: 'ポップアップがブロックされました。ブラウザの設定を確認してください。',
          canRetry: true,
          severity: 'warning'
        };
      
      case 'network_error':
        return {
          shouldShowError: true,
          userMessage: 'インターネット接続を確認してください。',
          canRetry: true,
          severity: 'error'
        };
      
      case 'invalid_credentials':
        return {
          shouldShowError: true,
          userMessage: '認証情報が正しくありません。',
          canRetry: true,
          severity: 'error'
        };
      
      default:
        return {
          shouldShowError: true,
          userMessage: '認証に失敗しました。しばらく待ってから再度お試しください。',
          canRetry: true,
          severity: 'error'
        };
    }
  }

  /**
   * ローカライズされたエラーメッセージを取得する
   * @param errorCode - エラーコード
   * @param locale - 言語設定（デフォルト: 'ja'）
   * @returns ローカライズされたエラーメッセージ
   */
  getLocalizedErrorMessage(errorCode: string, locale: string = 'ja'): string {
    const messages: Record<string, Record<string, string>> = {
      ja: {
        'auth_cancelled': '認証をキャンセルしました。',
        'popup_blocked': 'ポップアップがブロックされました。ブラウザの設定を確認してください。',
        'network_error': 'インターネット接続を確認してください。',
        'invalid_credentials': '認証情報が正しくありません。',
        'default': '認証に失敗しました。しばらく待ってから再度お試しください。'
      },
      en: {
        'auth_cancelled': 'Authentication was cancelled.',
        'popup_blocked': 'Popup was blocked. Please check your browser settings.',
        'network_error': 'Please check your internet connection.',
        'invalid_credentials': 'Invalid credentials.',
        'default': 'Authentication failed. Please try again later.'
      }
    };

    return messages[locale]?.[errorCode] || messages[locale]?.['default'] || messages['ja']['default'];
  }

  /**
   * 認証エラーの詳細ログを記録する
   * @param error - エラー情報
   * @param context - エラー発生コンテキスト
   */
  logAuthError(error: any, context: string): void {
    // セキュリティのため機密情報を除外してログ記録
    const sanitizedError = {
      code: error.code,
      message: error.message,
      provider: error.provider,
      timestamp: new Date().toISOString(),
      context: context
    };

    // 環境別のログレベル調整
    if (process.env.NODE_ENV === 'development') {
      console.error('認証エラー詳細:', sanitizedError);
    } else {
      console.error('認証エラー:', sanitizedError.code);
    }
  }
}