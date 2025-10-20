/**
 * 【機能概要】: ユーザー管理APIのOpenAPIルート定義
 * 【実装方針】: @hono/zod-openapiを使用したOpenAPI 3.1準拠のルート実装
 * 【テスト対応】: TASK-903のRedフェーズで作成された26テストケースを通すための最小実装
 * 【リファクタ状況】: Greenフェーズの最小実装を維持し、コメントと構造を改善
 * 🟢 信頼性レベル: TASK-902のauthRoutes.tsパターンと要件定義書に基づく実装
 */

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

/**
 * 【定数定義】: エラーコードとメッセージの一元管理
 * 【設計方針】: ハードコーディングを避け、保守性を向上
 * 🟢 信頼性レベル: REQ-104（詳細エラーメッセージ）とNFR-303（内部情報隠蔽）に基づく
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
 * 【エラーレスポンス生成関数】: 500エラーの共通処理
 * 【セキュリティ】: 内部実装詳細を隠蔽し、ユーザーフレンドリーなメッセージを返却（NFR-303）
 * 【ログ記録】: セキュリティイベントとしてエラー詳細を記録
 * 🟢 信頼性レベル: NFR-303（内部エラー詳細の隠蔽）に基づく実装
 *
 * @param error - キャッチされたエラーオブジェクト
 * @param endpoint - エラーが発生したエンドポイントパス
 * @returns 500 Internal Server Errorレスポンス
 */
function handleInternalServerError(error: unknown, endpoint: string) {
  // 【エラーログ記録】: タイムスタンプとエンドポイント情報を含む詳細ログ
  // 【セキュリティ】: スタックトレースやDB詳細は含めず、エラーメッセージのみ記録
  console.error('[SECURITY] Unexpected error:', {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'Unknown error',
    endpoint,
  });

  // 【内部情報隠蔽】: クライアントには実装詳細を露出しない
  return {
    success: false as const,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    },
  };
}

/**
 * 【OpenAPIHonoインスタンス作成】: Zodバリデーションとエラーハンドリングを統合
 * 【エラーハンドリング】: defaultHookでZodバリデーションエラーを400 Bad Requestに変換
 * 🟢 信頼性レベル: TASK-902のauthRoutes.tsと同じパターンを適用
 */
const users = new OpenAPIHono({
  /**
   * 【Zodバリデーションエラーハンドラ】: バリデーション失敗時のカスタム処理
   * 【実装方針】: REQ-104（詳細エラーメッセージと共に400 Bad Request返却）を満たす
   * 【テスト対応】: テストケース2-1, 2-4, 2-5, 2-6に対応
   * 🟢 信頼性レベル: 要件定義書のREQ-104に基づく実装
   */
  defaultHook: (result, c) => {
    if (result.success) {
      return;
    }

    // 【Zodエラー変換】: Zodのエラー形式をapiErrorResponseSchema形式に変換
    // 【フィールド単位エラー】: details objectにフィールド名とエラーメッセージを格納
    // 【定数使用】: ERROR_CODESとERROR_MESSAGESで一元管理
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
 * 【OpenAPIルート定義】: GET /users/{id} - ユーザー情報取得
 * 【実装方針】: Zodスキーマでパスパラメータとレスポンスを定義
 * 【テスト対応】: OpenAPIルート定義テスト（GET /users/{id}）の3テストケースに対応
 * 🟢 信頼性レベル: 要件定義書のエンドポイント1仕様に基づく
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
 * 【OpenAPIルート定義】: GET /users - ユーザー一覧取得
 * 【実装方針】: Zodスキーマでクエリパラメータとレスポンスを定義（ページネーション対応）
 * 【テスト対応】: OpenAPIルート定義テスト（GET /users）の3テストケースに対応
 * 🟢 信頼性レベル: 要件定義書のエンドポイント2仕様に基づく
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
 * 【OpenAPIルート定義】: PUT /users/{id} - ユーザー情報更新
 * 【実装方針】: Zodスキーマでパスパラメータ、ボディ、レスポンスを定義
 * 【テスト対応】: OpenAPIルート定義テスト（PUT /users/{id}）の3テストケースに対応
 * 🟢 信頼性レベル: 要件定義書のエンドポイント3仕様に基づく
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
 * 【GET /users/{id} ハンドラ】: ユーザー情報取得処理
 * 【実装方針】: テストを通すための最小実装（ダミーデータ返却）
 * 【テスト対応】: テストケース1-4, 1-5, 1-6, 2-1, 2-2, 2-3に対応
 * 🟡 信頼性レベル: 最小実装（UseCaseは未統合、ダミーデータで200 OKを返す）
 *
 * @param c - Honoコンテキスト
 * @returns ユーザー情報レスポンス（200 OK）
 */
users.openapi(getUserRoute, async (c) => {
  try {
    // 【バリデーション済みパラメータ取得】: Zodバリデーション成功後の値を取得
    // 【自動バリデーション】: @hono/zod-openapiが自動的にgetUserParamsSchemaで検証
    const { id } = c.req.valid('param');

    // 【最小実装】: テストを通すためのダミーレスポンス
    // 【TODO】: GetUserUseCaseを統合してDBからユーザー情報を取得（Refactorフェーズ）
    // 🟡 信頼性レベル: Greenフェーズ最小実装 - UseCase未統合
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

    // 【レスポンス返却】: getUserResponseSchemaに準拠したレスポンス
    return c.json(userResponse, 200);
  } catch (error) {
    // 【エラーハンドリング】: 共通関数で500エラーを処理
    // 【DRY原則】: 重複したエラーハンドリングコードを削減
    return c.json(handleInternalServerError(error, '/api/users/{id}'), 500);
  }
});

/**
 * 【GET /users ハンドラ】: ユーザー一覧取得処理
 * 【実装方針】: テストを通すための最小実装（空の一覧を返却）
 * 【テスト対応】: テストケース1-10, 1-11, 1-12, 2-4, 2-5, 2-6, 2-7, 2-8, 3-1, 3-2, 3-3に対応
 * 🟡 信頼性レベル: 最小実装（UseCaseは未統合、空のダミーデータで200 OKを返す）
 *
 * @param c - Honoコンテキスト
 * @returns ユーザー一覧レスポンス（200 OK）
 */
users.openapi(listUsersRoute, async (c) => {
  try {
    // 【バリデーション済みクエリパラメータ取得】: Zodバリデーション成功後の値を取得
    // 【デフォルト値適用】: listUsersQuerySchemaでlimit=20, offset=0がデフォルト設定
    const { limit = 20, offset = 0 } = c.req.valid('query');

    // 【最小実装】: テストを通すためのダミーレスポンス（空の一覧）
    // 【TODO】: ListUsersUseCaseを統合してDBからユーザー一覧を取得（Refactorフェーズ）
    // 🟡 信頼性レベル: Greenフェーズ最小実装 - UseCase未統合
    const listUsersResponse = {
      success: true as const,
      data: {
        users: [], // 【空の配列】: 最小実装ではユーザーデータなし
        total: 0,
        limit,
        offset,
      },
    };

    // 【レスポンス返却】: listUsersResponseSchemaに準拠したレスポンス
    return c.json(listUsersResponse, 200);
  } catch (error) {
    // 【エラーハンドリング】: 共通関数で500エラーを処理
    // 【DRY原則】: 重複したエラーハンドリングコードを削減
    return c.json(handleInternalServerError(error, '/api/users'), 500);
  }
});

/**
 * 【PUT /users/{id} ハンドラ】: ユーザー情報更新処理
 * 【実装方針】: テストを通すための最小実装（更新後のダミーデータ返却）
 * 【テスト対応】: 統合テストは未実装だが、OpenAPIルート定義テストに対応
 * 🟡 信頼性レベル: 最小実装（UseCaseは未統合、ダミーデータで200 OKを返す）
 *
 * @param c - Honoコンテキスト
 * @returns 更新後のユーザー情報レスポンス（200 OK）
 */
users.openapi(updateUserRoute, async (c) => {
  try {
    // 【バリデーション済みパラメータとボディ取得】: Zodバリデーション成功後の値を取得
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    // 【最小実装】: テストを通すためのダミーレスポンス
    // 【TODO】: UpdateUserUseCaseを統合してDBのユーザー情報を更新（Refactorフェーズ）
    // 🟡 信頼性レベル: Greenフェーズ最小実装 - UseCase未統合
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
        updatedAt: new Date().toISOString(), // 【更新タイムスタンプ】: 現在時刻を設定
        lastLoginAt: new Date().toISOString(),
      },
    };

    // 【レスポンス返却】: updateUserResponseSchemaに準拠したレスポンス
    return c.json(updateUserResponse, 200);
  } catch (error) {
    // 【エラーハンドリング】: 共通関数で500エラーを処理
    // 【DRY原則】: 重複したエラーハンドリングコードを削減
    return c.json(handleInternalServerError(error, '/api/users/{id}'), 500);
  }
});

export default users;
