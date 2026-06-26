/**
 * 認証エラー
 *
 * JWT検証失敗や認証失敗時に発生するエラー
 */
import { UserDomainError } from './UserDomainError';

export class AuthenticationError extends UserDomainError {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }

  /**
   * 無効なJWT署名のエラーを作成する
   * @return AuthenticationError インスタンス
   */
  static invalidToken(): AuthenticationError {
    return new AuthenticationError('INVALID_TOKEN', '認証トークンが無効です');
  }

  /**
   * トークンの期限切れエラーを作成する
   * @return AuthenticationError インスタンス
   */
  static tokenExpired(): AuthenticationError {
    return new AuthenticationError(
      'TOKEN_EXPIRED',
      '認証トークンの有効期限が切れています',
    );
  }

  /**
   * 無効な形式のトークンによるエラーを作成する
   * @return AuthenticationError インスタンス
   */
  static invalidFormat(): AuthenticationError {
    return new AuthenticationError('INVALID_FORMAT', '認証トークンが無効です');
  }
}
