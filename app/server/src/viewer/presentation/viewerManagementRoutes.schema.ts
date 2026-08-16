/**
 * viewer管理APIルート定義（スキーマのみ）
 *
 * このファイルはOpenAPI仕様生成用のルート定義です。
 * DB接続は不要で、スキーマ定義のみを行います。
 * 実際のハンドラ実装は別ファイル（viewerManagementRoutes.ts）で行います。
 */

import { createRoute, z } from '@hono/zod-openapi';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';
import {
  inviteViewerResponseSchema,
  inviteViewerSchema,
} from '@/packages/shared-schemas/src/viewers';

// ===== POST /api/projects/{projectId}/viewers - viewer招待 =====

export const inviteViewerRoute = createRoute({
  method: 'post',
  path: '/projects/{projectId}/viewers',
  tags: ['viewer管理'],
  summary: 'viewer招待',
  description: '指定プロジェクトへviewerをメールアドレスで招待します。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      projectId: z.uuid().openapi({
        param: { name: 'projectId', in: 'path' },
        example: '550e8400-e29b-41d4-a716-446655440000',
      }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: inviteViewerSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: inviteViewerResponseSchema,
        },
      },
      description: 'viewerを招待しました',
    },
    400: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'バリデーションエラー（メール形式不正・自己招待）',
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
      description: 'プロジェクトが見つかりません',
    },
    502: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: '招待メールの送信に失敗しました',
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

export const viewerManagementRoutes = [inviteViewerRoute];
