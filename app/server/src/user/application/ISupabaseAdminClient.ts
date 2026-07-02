/**
 * Supabase Admin クライアントインターフェース
 *
 * EmailSignupUseCase が依存する Supabase 操作の抽象化。
 * テスト時はこのインターフェースに対してモックを注入する。
 */
export interface ISupabaseAdminClient {
  /**
   * メールアドレスとパスワードでサインアップする
   *
   * @param email - 正規化済みメールアドレス
   * @param password - パスワード
   * @returns userId と error のペア
   */
  signUp(
    email: string,
    password: string,
  ): Promise<{ userId: string | null; error: Error | null }>;
}
