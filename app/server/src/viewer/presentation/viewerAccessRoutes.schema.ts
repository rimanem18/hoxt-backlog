/**
 * viewer横断閲覧APIルート定義（スキーマのみ）
 *
 * このファイルはOpenAPI仕様生成用のルート定義です。
 * DB接続は不要で、スキーマ定義のみを行います。
 * 実際のハンドラ実装は別ファイル（viewerAccessRoutes.ts）で行います。
 */

import { createRoute } from '@hono/zod-openapi';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';
import { getViewerTasksResponseSchema } from '@/packages/shared-schemas/src/viewers';

// ===== GET /api/viewer/tasks - viewer横断閲覧 =====

export const getViewerTasksRoute = createRoute({
  method: 'get',
  path: '/viewer/tasks',
  tags: ['viewer閲覧'],
  summary: 'viewer横断閲覧',
  description:
    'viewerアクセストークンで、招待されている全プロジェクトのタスク一覧をプロジェクトごとにグルーピングして取得します。',
  security: [{ ViewerAccessTokenAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: getViewerTasksResponseSchema,
        },
      },
      description: 'プロジェクトごとにグルーピングされたtask一覧を返しました',
    },
    401: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'アクセストークンが不正・失効・期限切れです',
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

export const viewerAccessRoutes = [getViewerTasksRoute];
