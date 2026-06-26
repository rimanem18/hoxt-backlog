/**
 * 認証APIのOpenAPIルート定義（スキーマのみ）
 *
 * Why: OpenAPI仕様生成時にデータベース接続を不要にするため、
 * createRoute定義のみを分離し、ハンドラ実装（DIコンテナ呼び出し）を含まない。
 */

import { createRoute } from '@hono/zod-openapi';
import {
  authCallbackRequestSchema,
  authCallbackResponseSchema,
} from '@/packages/shared-schemas/src/auth';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';

/**
 * POST /auth/callback のOpenAPIルート定義
 *
 * Supabase認証後のコールバック処理。
 */
export const authCallbackRoute = createRoute({
  method: 'post',
  path: '/auth/callback',
  tags: ['認証'],
  summary: 'Supabase認証後のコールバック処理',
  description:
    'Supabase認証後のユーザー情報を受け取り、ユーザー作成または更新を行う',
  request: {
    body: {
      content: {
        'application/json': {
          schema: authCallbackRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: authCallbackResponseSchema,
        },
      },
      description: '認証成功',
    },
    400: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'バリデーションエラー',
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
