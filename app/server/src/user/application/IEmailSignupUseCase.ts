/**
 * メールサインアップUseCaseインターフェース
 *
 * メールアドレスとパスワードによるユーザー登録を実行する。
 */

/** メールサインアップUseCase入力 */
export interface EmailSignupUseCaseInput {
  /** メールアドレス（正規化前） */
  email: string;
  /** パスワード */
  password: string;
}

/** メールサインアップUseCase出力 */
export interface EmailSignupUseCaseOutput {
  /** メール確認待ち状態 */
  pendingEmailConfirmation: true;
}

/** メールサインアップUseCase */
export interface IEmailSignupUseCase {
  /**
   * メールアドレス＋パスワードでサインアップを実行する
   *
   * @param input メールアドレスとパスワードを含む入力
   * @returns メール確認待ちを示すオブジェクト
   */
  execute(input: EmailSignupUseCaseInput): Promise<EmailSignupUseCaseOutput>;
}
