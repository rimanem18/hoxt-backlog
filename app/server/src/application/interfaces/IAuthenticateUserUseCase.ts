/**
 * ユーザー認証UseCaseインターフェース
 *
 * JWTトークンを受け取り、ユーザー認証・JITプロビジョニングを実行する。
 */
import type { User } from '../../domain/user/UserEntity';

/**
 * 認証UseCase入力
 */
export interface AuthenticateUserUseCaseInput {
  /** JWTトークン */
  jwt: string;
}

/**
 * 認証UseCase出力
 */
export interface AuthenticateUserUseCaseOutput {
  /** 認証済みユーザー情報 */
  user: User;
  /** 新規作成ユーザーかどうか */
  isNewUser: boolean;
}

/**
 * ユーザー認証UseCase
 */
export interface IAuthenticateUserUseCase {
  /**
   * ユーザー認証実行
   *
   * @param input JWTトークンを含む入力パラメータ
   * @returns 認証済みユーザー情報と新規作成フラグ
   */
  execute(
    input: AuthenticateUserUseCaseInput,
  ): Promise<AuthenticateUserUseCaseOutput>;
}
