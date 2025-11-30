/*
 * ユーザーコントローラー
 * 認証済みユーザーのプロフィール情報取得を提供する。
 * @example
 * ```typescript
 * const controller = new UserController(getUserProfileUseCase);
 * const userData = await controller.getProfileData(userId);
 * ```
 */

import type {
  GetUserProfileUseCaseInput,
  IGetUserProfileUseCase,
} from '@/application/usecases/GetUserProfileUseCase';

/*
 * HTTPユーザーコントローラークラス
 */
export class UserController {
  /*
   * UserControllerのコンストラクタ
   * @param getUserProfileUseCase ユーザープロフィール取得処理UseCase
   * @throws Error 必須依存関係がnull/undefinedの場合
   */
  constructor(private readonly getUserProfileUseCase: IGetUserProfileUseCase) {
    // Fail Fast原則：初期化時にnull依存関係を検出
    if (!getUserProfileUseCase) {
      throw new Error('getUserProfileUseCase is required');
    }
  }

  /*
   * ユーザープロフィールデータ取得
   * @param userId 認証済みユーザーID
   * @returns APIスキーマ準拠のユーザーオブジェクト
   * @throws UserNotFoundError ユーザーが見つからない場合
   * @throws InfrastructureError インフラ障害時
   */
  async getProfileData(userId: string) {
    // UseCaseへの委譲
    const input: GetUserProfileUseCaseInput = { userId };
    const result = await this.getUserProfileUseCase.execute(input);

    // ドメインモデル→APIスキーマへのマッピング
    return {
      id: result.user.id,
      externalId: result.user.externalId,
      provider: result.user.provider,
      email: result.user.email,
      name: result.user.name,
      avatarUrl: result.user.avatarUrl,
      createdAt: result.user.createdAt.toISOString(),
      updatedAt: result.user.updatedAt.toISOString(),
      lastLoginAt: result.user.lastLoginAt?.toISOString() || null,
    };
  }
}
