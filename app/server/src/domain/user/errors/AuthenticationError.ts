/**
 * 認証エラー
 *
 * JWT検証失敗や認証失敗時に発生するエラー
 */
import { UserDomainError } from './UserDomainError';

export class AuthenticationError extends UserDomainError {
  readonly code = 'AUTHENTICATION_ERROR';

  constructor(message: string = '認証に失敗しました') {
    super(message);
  }
}
