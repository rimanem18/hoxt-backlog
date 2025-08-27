/*
 * 認証エラークラス
 * 統一された認証エラーレスポンスを提供する。
 */

export class AuthError extends Error {
  /*
   * 認証エラーのコンストラクタ
   * @param code エラーコード（AUTHENTICATION_REQUIRED）
   * @param status HTTPステータスコード（デフォルト: 401）
   * @param message カスタムエラーメッセージ（オプション）
   */
  constructor(
    public readonly code: 'AUTHENTICATION_REQUIRED',
    public readonly status: number = 401,
    message?: string
  ) {
    // 統一エラーメッセージ
    const defaultMessage = 'ログインが必要です';

    super(message ?? defaultMessage);
    this.name = 'AuthError';
  }

  /*
   * JSON形式でのエラー情報返却
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        status: this.status
      }
    };
  }
}