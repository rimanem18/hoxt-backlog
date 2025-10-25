/**
 * ユーザー管理APIのOpenAPIルート定義（スキーマのみ）
 *
 * Why: OpenAPI仕様生成時にデータベース接続を不要にするため、
 * createRoute定義のみを分離し、ハンドラ実装（DIコンテナ呼び出し）を含まない。
 *
 * Note: このファイルは userRoutes.ts から参照され、
 * 同時に generate-openapi.ts からも参照される。
 */

import { createRoute, z } from '@hono/zod-openapi';
import {
  apiErrorResponseSchema,
  apiResponseSchema,
} from '@/packages/shared-schemas/src/common';
import {
  getUserResponseSchema,
  listUsersResponseSchema,
  updateUserBodySchema,
  updateUserResponseSchema,
  userSchema,
} from '@/packages/shared-schemas/src/users';

/**
 * GET /users/{id} のOpenAPIルート定義
 */
export const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  tags: ['ユーザー管理'],
  summary: 'ユーザー情報取得',
  description: 'ユーザーIDでユーザー情報を取得する',
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({ param: { name: 'id', in: 'path' } }),
    }),
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
export const listUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  tags: ['ユーザー管理'],
  summary: 'ユーザー一覧取得',
  description: 'ユーザー一覧を取得する（ページネーション・フィルタリング対応）',
  request: {
    query: z.object({
      provider: z
        .enum(['google', 'apple', 'microsoft', 'github', 'facebook', 'line'])
        .optional()
        .openapi({ param: { name: 'provider', in: 'query' } }),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .openapi({ param: { name: 'limit', in: 'query' } }),
      offset: z.coerce
        .number()
        .int()
        .min(0)
        .default(0)
        .openapi({ param: { name: 'offset', in: 'query' } }),
    }),
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
export const updateUserRoute = createRoute({
  method: 'put',
  path: '/users/{id}',
  tags: ['ユーザー管理'],
  summary: 'ユーザー情報更新',
  description: 'ユーザー情報を更新する（名前・アバターURL）',
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({ param: { name: 'id', in: 'path' } }),
    }),
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
export const getUserProfileRoute = createRoute({
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
