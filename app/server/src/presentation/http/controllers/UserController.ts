/*
 * ユーザーコントローラー
 * 認証済みユーザーのプロフィール情報取得を提供する。
 * @example
 * ```typescript
 * const controller = new UserController(getUserProfileUseCase);
 * const response = await controller.getProfile(context);
 * ```
 */

import type { Context } from 'hono';
import type {
  GetUserProfileUseCaseInput,
  IGetUserProfileUseCase,
} from '@/application/usecases/GetUserProfileUseCase';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import type { User as ApiUser } from '@/packages/shared-schemas/src/auth';
import type {
  ErrorResponse,
  GetUserProfileResponse,
} from '@/packages/shared-schemas/src/common';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { ValidationError } from '@/shared/errors/ValidationError';

/*
 * userID検証ガード関数
 * @param userId c.get('userId')から取得した値
 * @returns string型のuserIDであることを保証
 */
function isValidUserId(userId: unknown): userId is string {
  // null・undefined・空文字列・非文字列を排除
  return typeof userId === 'string' && userId.length > 0;
}

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
   * ユーザープロフィール取得エンドポイント
   * @param c HonoのContext（requireAuth()適用済み）
   * @returns JSON形式のレスポンス
   */
  async getProfile(c: Context): Promise<Response> {
    try {
      // 型安全な認証情報取得
      const rawUserId = c.get('userId');

      if (!isValidUserId(rawUserId)) {
        // AuthMiddleware通過後にuserIDが無効な場合
        throw new ValidationError('認証状態が無効です');
      }

      const userId = rawUserId;

      // UseCaseへの委譲
      const input: GetUserProfileUseCaseInput = { userId };
      const result = await this.getUserProfileUseCase.execute(input);

      // 統一レスポンス生成
      const responseData: GetUserProfileResponse<ApiUser> = {
        success: true,
        data: {
          id: result.user.id,
          externalId: result.user.externalId,
          provider: result.user.provider,
          email: result.user.email,
          name: result.user.name,
          avatarUrl: result.user.avatarUrl,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString(),
          lastLoginAt: result.user.lastLoginAt?.toISOString() || null,
        },
      };

      // 型安全なJSONレスポンスを返却
      return c.json<GetUserProfileResponse<ApiUser>>(responseData, 200);
    } catch (error) {
      // エラー種別に応じたレスポンス生成

      if (error instanceof UserNotFoundError) {
        // 認証済みであるがユーザーがDBに存在しない
        return c.json<ErrorResponse>(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'ユーザーが見つかりません',
            },
          },
          404,
        );
      }

      if (error instanceof ValidationError) {
        // 入力検証エラー（userID形式不正、認証状態異常等）
        return c.json<ErrorResponse>(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
            },
          },
          400,
        );
      }

      if (error instanceof InfrastructureError) {
        // インフラ障害（DB接続エラー、外部サービス障害等）
        return c.json<ErrorResponse>(
          {
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: '一時的にサービスが利用できません',
            },
          },
          500,
        );
      }

      // 予期外エラーの安全な処理
      console.error('Unexpected error in UserController:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      return c.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: '一時的にサービスが利用できません',
          },
        },
        500,
      );
    }
  }
}
