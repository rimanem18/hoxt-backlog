/**
 * ユーザー管理APIのOpenAPIルート定義
 *
 * @hono/zod-openapiを使用したOpenAPI 3.1準拠の実装
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import {
  apiErrorResponseSchema,
  apiResponseSchema,
} from '@/packages/shared-schemas/src/common';
import {
  getUserParamsSchema,
  getUserResponseSchema,
  listUsersQuerySchema,
  listUsersResponseSchema,
  updateUserBodySchema,
  updateUserResponseSchema,
  userSchema,
} from '@/packages/shared-schemas/src/users';
import { UserController } from '@/presentation/http/controllers/UserController';
import { requireAuth } from '@/presentation/http/middleware';

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

    // Zodのエラー形式をapiErrorResponseSchema形式に変換
    return c.json(
      {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: ERROR_MESSAGES.VALIDATION_ERROR,
          details: result.error.issues.reduce(
            (acc: Record<string, string>, issue) => {
              const field = issue.path.join('.');
              acc[field] = issue.message;
              return acc;
            },
            {},
          ),
        },
      },
      400,
    );
  },
});

/**
 * GET /users/{id} のOpenAPIルート定義
 */
const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  tags: ['ユーザー管理'],
  summary: 'ユーザー情報取得',
  description: 'ユーザーIDでユーザー情報を取得する',
  request: {
    params: getUserParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: getUserResponseSchema,
        },
      },
      description: 'ユーザー情報取得成功',
    },
    400: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'バリデーションエラー',
    },
    401: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'JWKS検証失敗',
    },
    404: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'ユーザーが見つからない',
    },
    500: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'サーバーエラー',
    },
  },
});

/**
 * GET /users のOpenAPIルート定義（ページネーション・フィルタリング対応）
 */
const listUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  tags: ['ユーザー管理'],
  summary: 'ユーザー一覧取得',
  description: 'ユーザー一覧を取得する（ページネーション・フィルタリング対応）',
  request: {
    query: listUsersQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: listUsersResponseSchema,
        },
      },
      description: 'ユーザー一覧取得成功',
    },
    400: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'バリデーションエラー',
    },
    401: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'JWKS検証失敗',
    },
    500: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'サーバーエラー',
    },
  },
});

/**
 * PUT /users/{id} のOpenAPIルート定義
 */
const updateUserRoute = createRoute({
  method: 'put',
  path: '/users/{id}',
  tags: ['ユーザー管理'],
  summary: 'ユーザー情報更新',
  description: 'ユーザー情報を更新する（名前・アバターURL）',
  request: {
    params: getUserParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: updateUserBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: updateUserResponseSchema,
        },
      },
      description: 'ユーザー情報更新成功',
    },
    400: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'バリデーションエラー',
    },
    401: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'JWKS検証失敗',
    },
    404: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'ユーザーが見つからない',
    },
    500: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'サーバーエラー',
    },
  },
});

/**
 * GET /user/profile のOpenAPIルート定義
 *
 * 認証済みユーザーの自身のプロフィール情報を取得する。
 */
const getUserProfileRoute = createRoute({
  method: 'get',
  path: '/user/profile',
  tags: ['認証ユーザー'],
  summary: '認証ユーザープロフィール取得',
  description: 'JWT認証済みユーザーの自身のプロフィール情報を取得する',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: apiResponseSchema(userSchema),
        },
      },
      description: 'プロフィール取得成功',
    },
    400: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'バリデーションエラー',
    },
    401: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'JWT認証失敗',
    },
    404: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'ユーザーが見つからない',
    },
    500: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'サーバーエラー',
    },
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
 * UserController.getProfile()に処理を委譲。
 */
users.use('/user/profile', requireAuth());
users.openapi(
  getUserProfileRoute,
  async (c) => await userController.getProfile(c),
);

export default users;
