/**
 * HTTPユーザーコントローラー
 *
 * 認証済みユーザーのプロフィール情報取得処理を提供するHTTPエンドポイント実装。
 * AuthMiddleware経由での認証済みユーザーID取得とレスポンス生成を行う。
 *
 * @example
 * ```typescript
 * const controller = new UserController(getUserProfileUseCase);
 * const response = await controller.getProfile(context);
 * ```
 */

import type { Context } from 'hono';
import type {
  IGetUserProfileUseCase,
  GetUserProfileUseCaseInput,
} from '@/application/usecases/GetUserProfileUseCase';
import type {
  GetUserProfileResponse,
  ErrorResponse,
} from '@/../../packages/shared-schemas';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import { ValidationError } from '@/shared/errors/ValidationError';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';

/**
 * HTTPユーザーコントローラークラス
 *
 * AuthMiddleware経由で設定されたユーザー情報の取得、
 * Application層への委譲、レスポンス生成までを管理する。
 */
export class UserController {
  /**
   * UserControllerのコンストラクタ
   *
   * @param getUserProfileUseCase ユーザープロフィール取得処理を行うUseCase
   */
  constructor(
    private readonly getUserProfileUseCase: IGetUserProfileUseCase,
  ) {
    // Fail Fast原則により初期化時にnull依存関係を検出
    if (!getUserProfileUseCase) {
      throw new Error('getUserProfileUseCase is required');
    }
  }

  /**
   * 【機能概要】: ユーザープロフィール取得エンドポイント
   * 【実装方針】: requireAuth() ミドルウェア前提での認証済みユーザー処理
   * 【テスト対応】: AuthMiddleware統合により認証状態を前提とした処理
   * 🟢 信頼性レベル: AuthMiddleware統合による確実な認証フロー
   *
   * @param c HonoのContext（requireAuth()でuserId保証済み）
   * @returns JSON形式のレスポンス
   */
  async getProfile(c: Context): Promise<Response> {
    try {
      // 【認証情報取得】: requireAuth() により userId は必ず存在
      // userRoutes.ts の requireAuth() 適用により null チェック不要
      const userId = c.get('userId') as string;

      // 【Application層委譲】: ビジネスロジック層への処理委譲
      const input: GetUserProfileUseCaseInput = { userId };
      const result = await this.getUserProfileUseCase.execute(input);

      // ユーザー情報を統一レスポンス形式に変換
      const responseData: GetUserProfileResponse = {
        success: true,
        data: {
          id: result.user.id,
          externalId: result.user.externalId,
          provider: result.user.provider,
          email: result.user.email,
          name: result.user.name,
          avatarUrl: result.user.avatarUrl,
          createdAt: result.user.createdAt.toISOString(),
          lastLoginAt: result.user.lastLoginAt?.toISOString() || null,
        },
      };

      return c.json<GetUserProfileResponse>(responseData, 200);
    } catch (error) {
      // エラー種別に応じたレスポンス生成

      if (error instanceof UserNotFoundError) {
        // ユーザー不存在エラーは404ステータスで返却
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
        // バリデーションエラーは400ステータスで返却
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
        // インフラストラクチャエラーは500ステータスで返却
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

      // 予期しないエラーは500ステータスで返却
      console.error('Unexpected error in UserController:', error);
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