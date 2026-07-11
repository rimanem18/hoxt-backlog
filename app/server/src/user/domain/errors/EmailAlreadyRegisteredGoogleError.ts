import { UserDomainError } from './UserDomainError';

/**
 * 同一メールで Google ユーザーが既に存在する場合のエラー
 *
 * REQ-302: Google アカウントで登録済みのメールアドレスで
 * メールパスワード登録を試みた場合に throw する。
 */
export class EmailAlreadyRegisteredGoogleError extends UserDomainError {
  readonly code = 'EMAIL_ALREADY_REGISTERED_GOOGLE' as const;

  constructor() {
    super(
      'このメールアドレスは Google アカウントで登録済みです。' +
        'Google ログインをお試しください。',
    );
  }
}
