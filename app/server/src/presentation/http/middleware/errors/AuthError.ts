/**
 * 【機能概要】: 認証関連のエラークラス定義
 * 【実装方針】: 統一されたエラーコードとHTTPステータスの管理
 * 【テスト対応】: 認証エラーの種別をテストで検証可能
 * 🟢 信頼性レベル: RFC準拠のエラーハンドリングパターン
 */

export class AuthError extends Error {
  /**
   * 認証エラーのコンストラクタ
   * @param code エラー種別コード
   * @param status HTTPステータスコード（デフォルト: 401）
   * @param message カスタムエラーメッセージ（オプション）
   */
  constructor(
    public readonly code: 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'USER_BANNED',
    public readonly status: number = 401,
    message?: string
  ) {
    // 【エラーメッセージ生成】: コードに基づいたデフォルトメッセージ
    const defaultMessages = {
      TOKEN_MISSING: '認証トークンが必要です',
      TOKEN_INVALID: '認証トークンが無効です', 
      TOKEN_EXPIRED: '認証トークンの有効期限が切れています',
      USER_BANNED: 'アカウントが無効化されています'
    };

    super(message ?? defaultMessages[code]);
    this.name = 'AuthError';
  }

  /**
   *【JSON変換】: エラーレスポンス用の構造化データ生成
   * 統一されたエラーレスポンス形式でクライアントに返却
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