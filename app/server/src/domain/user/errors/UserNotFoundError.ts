import { UserDomainError } from './UserDomainError';

/**
 * ユーザー不存在エラー
 *
 * 指定されたユーザーIDまたは条件で
 * ユーザーが見つからない場合にスローされる。
 */
export class UserNotFoundError extends UserDomainError {
  readonly code = 'USER_NOT_FOUND';

  /**
   * ユーザー不存在エラーを初期化する
   * @param message - エラーメッセージ（省略時はデフォルトメッセージ）
   */
  constructor(message: string = 'ユーザーが見つかりません') {
    super(message);
  }

  /**
   * ユーザーIDによる不存在エラーを作成する
   * @param userId - 見つからなかったユーザーID
   * @returns UserNotFoundError インスタンス
   */
  static forUserId(userId: string): UserNotFoundError {
    return new UserNotFoundError(`ユーザーID '${userId}' が見つかりません`);
  }

  /**
   * 外部IDによる不存在エラーを作成する
   * @param externalId - 見つからなかった外部ID
   * @param provider - 認証プロバイダー
   * @returns UserNotFoundError インスタンス
   */
  static forExternalId(
    externalId: string,
    provider: string,
  ): UserNotFoundError {
    return new UserNotFoundError(
      `外部ID '${externalId}' (プロバイダー: ${provider}) のユーザーが見つかりません`,
    );
  }
}
