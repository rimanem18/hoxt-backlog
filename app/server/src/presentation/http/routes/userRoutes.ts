/**
 * ユーザー管理APIのOpenAPIルート定義
 *
 * @hono/zod-openapiを使用したOpenAPI 3.1準拠の実装
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import { UserController } from '@/presentation/http/controllers/UserController';
import { requireAuth } from '@/presentation/http/middleware';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { ValidationError } from '@/shared/errors/ValidationError';
import { formatZodError } from '@/shared/utils/zodErrorFormatter';
import {
  getUserProfileRoute,
  getUserRoute,
  listUsersRoute,
  updateUserRoute,
} from './userRoutes.schema';

/**
 * エラーコードとメッセージの定数定義
 */
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'バリデーションエラー',
  INTERNAL_SERVER_ERROR: '一時的にサービスが利用できません',
} as const;

/**
 * userID検証ガード関数
 * @param userId c.get('userId')から取得した値
 * @returns string型のuserIDであることを保証
 */
function isValidUserId(userId: unknown): userId is string {
  // null・undefined・空文字列・非文字列を排除
  return typeof userId === 'string' && userId.length > 0;
}

/**
 * 500エラーのレスポンスを生成する
 *
 * @param error キャッチされたエラーオブジェクト
 * @param endpoint エラーが発生したエンドポイントパス
 * @returns 500 Internal Server Errorレスポンス
 */
function handleInternalServerError(error: unknown, endpoint: string) {
  // スタックトレースを含めずエラーメッセージのみ記録（内部実装詳細の隠蔽）
  console.error('[SECURITY] Unexpected error:', {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'Unknown error',
    endpoint,
  });

  return {
    success: false as const,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    },
  };
}

/**
 * OpenAPIHonoインスタンス
 *
 * defaultHookでZodバリデーションエラーを400 Bad Requestに変換
 */
const users = new OpenAPIHono({
  /**
   * Zodバリデーション失敗時のエラーハンドラ
   */
  defaultHook: (result, c) => {
    if (result.success) {
      return;
    }

    return c.json(
      {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: ERROR_MESSAGES.VALIDATION_ERROR,
          details: formatZodError(result.error.issues),
        },
      },
      400,
    );
  },
});

/**
 * GET /users/{id} ハンドラ
 */
users.openapi(getUserRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');

    // TODO: GetUserUseCaseを統合してDBからユーザー情報を取得
    const userResponse = {
      success: true as const,
      data: {
        id,
        externalId: 'dummy-external-id',
        provider: 'google' as const,
        email: 'user@example.com',
        name: 'Dummy User',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
    };

    return c.json(userResponse, 200);
  } catch (error) {
    return c.json(handleInternalServerError(error, '/api/users/{id}'), 500);
  }
});

/**
 * GET /users ハンドラ
 */
users.openapi(listUsersRoute, async (c) => {
  try {
    const { limit = 20, offset = 0 } = c.req.valid('query');

    // TODO: ListUsersUseCaseを統合してDBからユーザー一覧を取得
    const listUsersResponse = {
      success: true as const,
      data: {
        users: [],
        total: 0,
        limit,
        offset,
      },
    };

    return c.json(listUsersResponse, 200);
  } catch (error) {
    return c.json(handleInternalServerError(error, '/api/users'), 500);
  }
});

/**
 * PUT /users/{id} ハンドラ
 */
users.openapi(updateUserRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    // TODO: UpdateUserUseCaseを統合してDBのユーザー情報を更新
    const updateUserResponse = {
      success: true as const,
      data: {
        id,
        externalId: 'dummy-external-id',
        provider: 'google' as const,
        email: 'user@example.com',
        name: body.name ?? 'Updated User',
        avatarUrl: body.avatarUrl ?? 'https://example.com/avatar.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
    };

    return c.json(updateUserResponse, 200);
  } catch (error) {
    return c.json(handleInternalServerError(error, '/api/users/{id}'), 500);
  }
});

/**
 * UserControllerのインスタンス化
 *
 * AuthDIContainerから依存性を注入してUserControllerを生成。
 * モジュールスコープで1回だけインスタンス化（リクエストごとではない）。
 */
const userController = new UserController(
  AuthDIContainer.getUserProfileUseCase(),
);

/**
 * GET /user/profile ハンドラ
 *
 * requireAuth()ミドルウェアでJWT認証を強制し、
 * UserController.getProfileData()にビジネスロジックを委譲。
 * HTTPレスポンス形成はハンドラ内で実施。
 */
users.use('/user/profile', requireAuth());
users.openapi(getUserProfileRoute, async (c) => {
  try {
    // 認証情報取得
    const rawUserId = c.get('userId');

    if (!isValidUserId(rawUserId)) {
      // AuthMiddleware通過後にuserIDが無効な場合
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '認証状態が無効です',
          },
        },
        400,
      );
    }

    // ビジネスロジック委譲
    const userData = await userController.getProfileData(rawUserId);

    // 成功レスポンス
    return c.json(
      {
        success: true,
        data: userData,
      },
      200,
    );
  } catch (error) {
    // エラー種別ごとのハンドリング
    if (error instanceof UserNotFoundError) {
      // 認証済みであるがユーザーがDBに存在しない
      return c.json(
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
      // 入力検証エラー
      return c.json(
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
      return c.json(
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
    console.error('Unexpected error in /user/profile:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return c.json(
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
});

export default users;
