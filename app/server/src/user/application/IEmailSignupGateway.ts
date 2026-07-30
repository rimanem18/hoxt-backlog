/**
 * メールサインアップゲートウェイインターフェース（Application 層 port）
 *
 * EmailSignupUseCase が依存する外部 Supabase 操作の抽象化。
 * ベンダー名を含まない UC 語彙に寄せた port 名（DDD: §2.2）。
 * テスト時はこのインターフェースに対してモックを注入する。
 */
export interface IEmailSignupGateway {
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
