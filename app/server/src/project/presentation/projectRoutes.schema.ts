/**
 * プロジェクト管理APIルート定義（スキーマのみ）
 *
 * このファイルはOpenAPI仕様生成用のルート定義です。
 * DB接続は不要で、スキーマ定義のみを行います。
 * 実際のハンドラ実装は別ファイル（projectRoutes.ts）で行います。
 */

import { createRoute, z } from '@hono/zod-openapi';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';
import {
  createProjectResponseSchema,
  createProjectSchema,
  getProjectResponseSchema,
  listProjectsResponseSchema,
  updateProjectResponseSchema,
  updateProjectSchema,
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

// ===== GET /api/projects - プロジェクト一覧取得 =====

export const listProjectsRoute = createRoute({
  method: 'get',
  path: '/projects',
  tags: ['プロジェクト管理'],
  summary: 'プロジェクト一覧取得',
  description: 'ログインユーザーのプロジェクト一覧を取得します。',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: listProjectsResponseSchema,
        },
      },
      description: 'プロジェクト一覧を取得しました',
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

// ===== GET /api/projects/:id - プロジェクト詳細取得 =====

export const getProjectRoute = createRoute({
  method: 'get',
  path: '/projects/{id}',
  tags: ['プロジェクト管理'],
  summary: 'プロジェクト詳細取得',
  description: 'プロジェクトIDでプロジェクト詳細を取得します。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '550e8400-e29b-41d4-a716-446655440000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: getProjectResponseSchema,
        },
      },
      description: 'プロジェクト詳細を取得しました',
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
      description: 'プロジェクトが見つかりません',
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

// ===== PUT /api/projects/:id - プロジェクト編集 =====

export const updateProjectRoute = createRoute({
  method: 'put',
  path: '/projects/{id}',
  tags: ['プロジェクト管理'],
  summary: 'プロジェクト編集',
  description: 'プロジェクトの名称・説明文を更新します（部分更新）。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '550e8400-e29b-41d4-a716-446655440000',
      }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: updateProjectSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: updateProjectResponseSchema,
        },
      },
      description: 'プロジェクトを更新しました',
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
      description: 'プロジェクトが見つかりません',
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

export const projectRoutes = [
  createProjectRoute,
  listProjectsRoute,
  getProjectRoute,
  updateProjectRoute,
];
