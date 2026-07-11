import { UserDomainError } from './UserDomainError';

/**
 * 同一メールで email ユーザーが既に存在する場合のエラー
 *
 * REQ-002: 1 メール = 1 ユーザー制約。
 * 既存 email プロバイダーのユーザーと同一メールで登録を試みた場合に throw する。
 */
export class EmailAlreadyRegisteredError extends UserDomainError {
  readonly code = 'EMAIL_ALREADY_REGISTERED' as const;

  constructor() {
    super('このメールアドレスは既に登録されています。');
  }
}
