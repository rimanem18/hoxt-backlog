/**
 * UserRoutes OpenAPI定義のテストケース集
 *
 * OpenAPIルート定義の正常登録とスキーマ統合を確認するテスト
 * TASK-903: ユーザー管理エンドポイントのOpenAPI対応化
 *
 * @see docs/implements/TASK-903/type-safety-enhancement-testcases.md
 */

import { describe, expect, test } from 'bun:test';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';
import {
  getUserParamsSchema,
  getUserResponseSchema,
  listUsersQuerySchema,
  listUsersResponseSchema,
  updateUserBodySchema,
  updateUserResponseSchema,
} from '@/packages/shared-schemas/src/users';

describe('GET /users/{id} - OpenAPIルート定義', () => {
  test('OpenAPIルートが正常に登録される', () => {
    // Given: OpenAPIルート定義を作成
    const route = createRoute({
      method: 'get',
      path: '/users/{id}',
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

    // When: OpenAPIHonoアプリにルートを登録
    const app = new OpenAPIHono();

    // Then: エラーなく登録が完了する
    expect(() => {
      app.openapi(route, async (c) => {
        return c.json(
          {
            success: true,
            data: {
              id: '',
              externalId: '',
              provider: 'google' as const,
              email: '',
              name: '',
              avatarUrl: null,
              createdAt: '',
              updatedAt: '',
              lastLoginAt: '',
            },
          },
          200,
        );
      });
    }).not.toThrow();
  });

  test('Zodスキーマが正しくOpenAPI仕様に反映される', () => {
    // Given: Zodスキーマを含むルート定義を作成
    const route = createRoute({
      method: 'get',
      path: '/users/{id}',
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
      },
    });

    // When: ルート定義からスキーマを取得
    const requestParamsSchema = route.request?.params;
    const responseSchema =
      route.responses?.[200]?.content?.['application/json']?.schema;

    // Then: スキーマが正しく定義されている
    expect(requestParamsSchema).toBeDefined();
    expect(responseSchema).toBeDefined();
    expect(requestParamsSchema).toBe(getUserParamsSchema);
    expect(responseSchema).toBe(getUserResponseSchema);
  });

  test('OpenAPIメタデータ（description、tags）が正しく設定される', () => {
    // Given: メタデータ付きのルート定義を作成
    const route = createRoute({
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
      },
    });

    // Then: メタデータが正しく設定されている
    expect(route.tags).toEqual(['ユーザー管理']);
    expect(route.summary).toBe('ユーザー情報取得');
    expect(route.description).toBe('ユーザーIDでユーザー情報を取得する');
  });
});

describe('GET /users - OpenAPIルート定義', () => {
  test('OpenAPIルートが正常に登録される', () => {
    // Given: クエリパラメータ対応のルート定義を作成
    const route = createRoute({
      method: 'get',
      path: '/users',
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

    // When: OpenAPIHonoアプリにルートを登録
    const app = new OpenAPIHono();

    // Then: エラーなく登録が完了する
    expect(() => {
      app.openapi(route, async (c) => {
        return c.json(
          {
            success: true,
            data: {
              users: [],
              total: 0,
              limit: 20,
              offset: 0,
            },
          },
          200,
        );
      });
    }).not.toThrow();
  });

  test('Zodスキーマが正しくOpenAPI仕様に反映される', () => {
    // Given: クエリパラメータを含むルート定義を作成
    const route = createRoute({
      method: 'get',
      path: '/users',
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
      },
    });

    // When: ルート定義からスキーマを取得
    const requestQuerySchema = route.request?.query;
    const responseSchema =
      route.responses?.[200]?.content?.['application/json']?.schema;

    // Then: スキーマが正しく定義されている
    expect(requestQuerySchema).toBeDefined();
    expect(responseSchema).toBeDefined();
    expect(requestQuerySchema).toBe(listUsersQuerySchema);
    expect(responseSchema).toBe(listUsersResponseSchema);
  });

  test('OpenAPIメタデータ（description、tags）が正しく設定される', () => {
    // Given: メタデータ付きのルート定義を作成
    const route = createRoute({
      method: 'get',
      path: '/users',
      tags: ['ユーザー管理'],
      summary: 'ユーザー一覧取得',
      description:
        'ユーザー一覧を取得する（ページネーション・フィルタリング対応）',
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
      },
    });

    // Then: メタデータが正しく設定されている
    expect(route.tags).toEqual(['ユーザー管理']);
    expect(route.summary).toBe('ユーザー一覧取得');
    expect(route.description).toBe(
      'ユーザー一覧を取得する（ページネーション・フィルタリング対応）',
    );
  });
});

describe('PUT /users/{id} - OpenAPIルート定義', () => {
  test('OpenAPIルートが正常に登録される', () => {
    // Given: パスパラメータとボディを含むルート定義を作成
    const route = createRoute({
      method: 'put',
      path: '/users/{id}',
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

    // When: OpenAPIHonoアプリにルートを登録
    const app = new OpenAPIHono();

    // Then: エラーなく登録が完了する
    expect(() => {
      app.openapi(route, async (c) => {
        return c.json(
          {
            success: true,
            data: {
              id: '',
              externalId: '',
              provider: 'google' as const,
              email: '',
              name: '',
              avatarUrl: null,
              createdAt: '',
              updatedAt: '',
              lastLoginAt: '',
            },
          },
          200,
        );
      });
    }).not.toThrow();
  });

  test('Zodスキーマが正しくOpenAPI仕様に反映される', () => {
    // Given: パスパラメータとボディを含むルート定義を作成
    const route = createRoute({
      method: 'put',
      path: '/users/{id}',
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
      },
    });

    // When: ルート定義からスキーマを取得
    const requestParamsSchema = route.request?.params;
    const requestBodySchema =
      route.request?.body?.content?.['application/json']?.schema;
    const responseSchema =
      route.responses?.[200]?.content?.['application/json']?.schema;

    // Then: スキーマが正しく定義されている
    expect(requestParamsSchema).toBeDefined();
    expect(requestBodySchema).toBeDefined();
    expect(responseSchema).toBeDefined();
    expect(requestParamsSchema).toBe(getUserParamsSchema);
    expect(requestBodySchema).toBe(updateUserBodySchema);
    expect(responseSchema).toBe(updateUserResponseSchema);
  });

  test('OpenAPIメタデータ（description、tags）が正しく設定される', () => {
    // Given: メタデータ付きのルート定義を作成
    const route = createRoute({
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
      },
    });

    // Then: メタデータが正しく設定されている
    expect(route.tags).toEqual(['ユーザー管理']);
    expect(route.summary).toBe('ユーザー情報更新');
    expect(route.description).toBe(
      'ユーザー情報を更新する（名前・アバターURL）',
    );
  });
});
