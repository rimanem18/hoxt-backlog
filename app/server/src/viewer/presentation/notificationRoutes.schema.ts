/**
 * viewer通知設定APIルート定義（スキーマのみ）
 *
 * このファイルはOpenAPI仕様生成用のルート定義です。
 * DB接続は不要で、スキーマ定義のみを行います。
 * 実際のハンドラ実装は別ファイル（notificationRoutes.ts）で行います。
 */

import { createRoute, z } from '@hono/zod-openapi';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';
import {
  updateNotificationSettingBodySchema,
  updateNotificationSettingResponseSchema,
} from '@/packages/shared-schemas/src/viewers';

// ===== PATCH /api/viewer/projects/{projectId}/notification-setting - 通知設定変更 =====

export const updateNotificationSettingRoute = createRoute({
  method: 'patch',
  path: '/viewer/projects/{projectId}/notification-setting',
  tags: ['viewer閲覧'],
  summary: '通知ON/OFF変更',
  description:
    'viewerアクセストークンで、指定projectの通知ON/OFF設定を変更します。',
  security: [{ ViewerAccessTokenAuth: [] }],
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
          schema: updateNotificationSettingBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: updateNotificationSettingResponseSchema,
        },
      },
      description: '通知設定を変更しました',
    },
    401: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'アクセストークンが不正・失効・期限切れです',
    },
    404: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: '指定projectへのactive招待が存在しません',
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

export const notificationRoutes = [updateNotificationSettingRoute];
