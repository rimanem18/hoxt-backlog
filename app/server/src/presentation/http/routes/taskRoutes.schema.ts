/**
 * タスク管理APIルート定義（スキーマのみ）
 *
 * このファイルはOpenAPI仕様生成用のルート定義です。
 * DB接続は不要で、スキーマ定義のみを行います。
 * 実際のハンドラ実装は別ファイル（taskRoutes.ts）で行います。
 */

import { createRoute, z } from '@hono/zod-openapi';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';
import {
  changeTaskStatusBodySchema,
  changeTaskStatusResponseSchema,
  createTaskBodySchema,
  createTaskResponseSchema,
  getTaskResponseSchema,
  listTasksResponseSchema,
  taskStatusSchema,
  updateTaskBodySchema,
  updateTaskResponseSchema,
} from '@/packages/shared-schemas/src/tasks';

// ===== GET /api/tasks - タスク一覧取得 =====

export const listTasksRoute = createRoute({
  method: 'get',
  path: '/tasks',
  tags: ['タスク管理'],
  summary: 'タスク一覧取得',
  description:
    'ログインユーザーのタスク一覧を取得します。フィルタとソートに対応しています。',
  security: [{ BearerAuth: [] }],
  request: {
    query: z.object({
      priority: z
        .enum(['high', 'medium', 'low'])
        .optional()
        .openapi({
          param: { name: 'priority', in: 'query' },
          description: 'タスクの優先度',
          example: 'high',
        }),
      status: z
        .string()
        .optional()
        .refine(
          (val) =>
            !val ||
            val
              .split(',')
              .every((s) =>
                taskStatusSchema.options.includes(
                  s.trim() as (typeof taskStatusSchema.options)[number],
                ),
              ),
          'ステータスは有効な値のカンマ区切りである必要があります',
        )
        .openapi({
          param: { name: 'status', in: 'query' },
          description: 'ステータス（カンマ区切りで複数選択可能）',
          example: 'in_progress,in_review',
        }),
      sort: z
        .enum(['created_at_desc', 'created_at_asc', 'priority_desc'])
        .default('created_at_desc')
        .openapi({
          param: { name: 'sort', in: 'query' },
          description: 'タスクのソート順',
          example: 'priority_desc',
        }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: listTasksResponseSchema,
        },
      },
      description: 'タスク一覧を取得しました',
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

// ===== POST /api/tasks - タスク作成 =====

export const createTaskRoute = createRoute({
  method: 'post',
  path: '/tasks',
  tags: ['タスク管理'],
  summary: 'タスク作成',
  description: '新しいタスクを作成します。',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createTaskBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: createTaskResponseSchema,
        },
      },
      description: 'タスクを作成しました',
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

// ===== GET /api/tasks/:id - タスク詳細取得 =====

export const getTaskRoute = createRoute({
  method: 'get',
  path: '/tasks/{id}',
  tags: ['タスク管理'],
  summary: 'タスク詳細取得',
  description: 'タスクIDでタスク詳細を取得します。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '550e8400-e29b-41d4-a716-446655440000',
        }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: getTaskResponseSchema,
        },
      },
      description: 'タスク詳細を取得しました',
    },
    401: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'JWT認証失敗',
    },
    403: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: '他ユーザーのタスクにアクセスしようとしました',
    },
    404: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'タスクが見つかりません',
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

// ===== PUT /api/tasks/:id - タスク更新 =====

export const updateTaskRoute = createRoute({
  method: 'put',
  path: '/tasks/{id}',
  tags: ['タスク管理'],
  summary: 'タスク更新',
  description: 'タスクの情報を更新します（部分更新）。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '550e8400-e29b-41d4-a716-446655440000',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateTaskBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: updateTaskResponseSchema,
        },
      },
      description: 'タスクを更新しました',
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
      description: 'タスクが見つかりません',
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

// ===== PATCH /api/tasks/:id/status - タスクステータス変更 =====

export const changeTaskStatusRoute = createRoute({
  method: 'patch',
  path: '/tasks/{id}/status',
  tags: ['タスク管理'],
  summary: 'タスクステータス変更',
  description: 'タスクのステータスを変更します。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '550e8400-e29b-41d4-a716-446655440000',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: changeTaskStatusBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: changeTaskStatusResponseSchema,
        },
      },
      description: 'タスクステータスを変更しました',
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
      description: 'タスクが見つかりません',
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

// ===== DELETE /api/tasks/:id - タスク削除 =====

export const deleteTaskRoute = createRoute({
  method: 'delete',
  path: '/tasks/{id}',
  tags: ['タスク管理'],
  summary: 'タスク削除',
  description: 'タスクを削除します（物理削除）。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '550e8400-e29b-41d4-a716-446655440000',
        }),
    }),
  },
  responses: {
    204: {
      description: 'タスクを削除しました',
    },
    401: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'JWT認証失敗',
    },
    403: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: '他ユーザーのタスクを削除しようとしました',
    },
    404: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'タスクが見つかりません',
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

export const taskRoutes = [
  listTasksRoute,
  createTaskRoute,
  getTaskRoute,
  updateTaskRoute,
  changeTaskStatusRoute,
  deleteTaskRoute,
];
