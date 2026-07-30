import type { IUserRepository } from '@/user/domain';
import { EmailAlreadyRegisteredError } from '@/user/domain/errors/EmailAlreadyRegisteredError';
import { EmailAlreadyRegisteredGoogleError } from '@/user/domain/errors/EmailAlreadyRegisteredGoogleError';
import { SignupFailedError } from '@/user/domain/errors/SignupFailedError';
import { EmailAddress } from '@/user/domain/valueobjects/EmailAddress';
import type { IEmailSignupGateway } from './IEmailSignupGateway';

/**
 * メールアドレス＋パスワードによるユーザー登録ユースケース
 *
 * 既存ユーザーとの重複チェックを行い、Supabase へサインアップ登録する。
 * 登録成功後はメール確認待ち状態を返す。
 */
export class EmailSignupUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly signupGateway: IEmailSignupGateway,
  ) {}

  /**
   * メールアドレス＋パスワードでサインアップを実行する
   *
   * @param input.email - メールアドレス（正規化前）
   * @param input.password - パスワード
   * @returns メール確認待ちを示すオブジェクト
   * @throws EmailAlreadyRegisteredGoogleError - 同メールの Google ユーザーが存在する場合
   * @throws EmailAlreadyRegisteredError - 同メールの email ユーザーが存在する場合
   * @throws SignupFailedError - Supabase サインアップに失敗した場合
   */
  async execute(input: {
    email: string;
    password: string;
  }): Promise<{ pendingEmailConfirmation: true }> {
    const normalizedEmail = EmailAddress.of(input.email).value;

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser !== null) {
      if (existingUser.provider === 'google') {
        throw new EmailAlreadyRegisteredGoogleError();
      }
      throw new EmailAlreadyRegisteredError();
    }

    const result = await this.signupGateway.signUp(
      normalizedEmail,
      input.password,
    );

    if (result.error !== null) {
      throw new SignupFailedError(result.error.message);
    }

    return { pendingEmailConfirmation: true };
  }
}
