/**
 * トークン期限切れエラー
 *
 * JWTの有効期限切れ時に発生する特殊な認証エラー
 */
import { UserDomainError } from './UserDomainError';

export class TokenExpiredError extends UserDomainError {
  readonly code = 'TOKEN_EXPIRED';

  constructor(message: string = '認証トークンの有効期限が切れています') {
    super(message);
  }
}
