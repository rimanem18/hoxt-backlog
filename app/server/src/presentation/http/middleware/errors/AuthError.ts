/**
 * 【機能概要】: 認証関連のエラークラス定義（設計仕様準拠）
 * 【実装方針】: api-endpoints.md準拠の統一エラーコード（AUTHENTICATION_REQUIRED）
 * 【テスト対応】: 認証エラーの統一レスポンスをテストで検証可能
 * 🟢 信頼性レベル: api-endpoints.md設計仕様準拠のエラーハンドリング
 */

export class AuthError extends Error {
  /**
   * 認証エラーのコンストラクタ（統一エラーコード仕様）
   * @param code 統一エラーコード（AUTHENTICATION_REQUIRED）
   * @param status HTTPステータスコード（デフォルト: 401）
   * @param message カスタムエラーメッセージ（オプション）
   */
  constructor(
    public readonly code: 'AUTHENTICATION_REQUIRED',
    public readonly status: number = 401,
    message?: string
  ) {
    // 【統一メッセージ】: api-endpoints.md準拠の統一エラーメッセージ
    const defaultMessage = 'ログインが必要です';

    super(message ?? defaultMessage);
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