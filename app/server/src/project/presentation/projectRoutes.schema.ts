/**
 * プロジェクト管理APIルート定義（スキーマのみ）
 *
 * このファイルはOpenAPI仕様生成用のルート定義です。
 * DB接続は不要で、スキーマ定義のみを行います。
 * 実際のハンドラ実装は別ファイル（projectRoutes.ts）で行います。
 */

import { createRoute } from '@hono/zod-openapi';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';
import {
  createProjectResponseSchema,
  createProjectSchema,
} from '@/packages/shared-schemas/src/projects';

// ===== POST /api/projects - プロジェクト作成 =====

export const createProjectRoute = createRoute({
  method: 'post',
  path: '/projects',
  tags: ['プロジェクト管理'],
  summary: 'プロジェクト作成',
  description: '新しいプロジェクトを作成します。',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createProjectSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: createProjectResponseSchema,
        },
      },
      description: 'プロジェクトを作成しました',
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

// ===== ルート配列のエクスポート =====

export const projectRoutes = [createProjectRoute];
