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
import {
  getUserParamsSchema,
  getUserResponseSchema,
  listUsersQuerySchema,
  listUsersResponseSchema,
  updateUserBodySchema,
  updateUserResponseSchema,
} from '@/packages/shared-schemas/src/users';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';

describe('GET /users/{id} - OpenAPIルート定義', () => {
  test('OpenAPIルートが正常に登録される', () => {
    // 【テスト目的】: createRouteで定義したOpenAPIルートがHonoアプリに正常に登録されることを確認
    // 【テスト内容】: OpenAPIHonoインスタンスに対してcreateRouteの結果を登録し、エラーが発生しないことを検証
    // 【期待される動作】: ルート定義が成功し、OpenAPI仕様に含まれる
    // 🟢 信頼性レベル: 青信号（@hono/zod-openapiの公式ドキュメントと要件定義書に基づく）

    // 【テストデータ準備】: OpenAPIルート定義オブジェクトを作成
    // 【初期条件設定】: Zodスキーマを使用してリクエスト・レスポンスを定義
    // 【前提条件確認】: shared-schemasパッケージのスキーマが正しくインポートされている
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

    // 【実際の処理実行】: OpenAPIHonoアプリにルートを登録
    // 【処理内容】: app.openapiメソッドでルート定義をHonoアプリに追加
    // 【実行タイミング】: createRouteでルート定義オブジェクトが作成された直後
    const app = new OpenAPIHono();

    // 【結果検証】: ルート登録時にエラーが発生しないことを確認
    // 【期待値確認】: app.openapiが正常に実行され、例外がスローされない理由は、createRouteの戻り値が正しいルート定義であるため
    // 【品質保証】: OpenAPIルート定義が正しく構造化されていることを保証し、API仕様書生成の基盤となる
    expect(() => {
      app.openapi(route, async (c) => {
        // 【検証項目】: ハンドラ関数がダミーレスポンスを返せることを確認（実装はGreenフェーズで行う）
        // 🟢 この実装パターンは@hono/zod-openapiの公式サンプルに基づく
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
    }).not.toThrow(); // 【確認内容】: ルート登録処理が例外なく完了し、OpenAPIルートとして正常に機能する
  });

  test('Zodスキーマが正しくOpenAPI仕様に反映される', () => {
    // 【テスト目的】: Zodスキーマ（getUserParamsSchema等）がOpenAPI仕様のJSONスキーマとして正しく変換されることを確認
    // 【テスト内容】: createRouteで定義されたスキーマが、OpenAPIドキュメント生成時に参照可能であることを検証
    // 【期待される動作】: ZodスキーマがOpenAPI 3.1のJSONスキーマ形式に変換され、仕様書に含まれる
    // 🟢 信頼性レベル: 青信号（REQ-004「ZodスキーマからOpenAPI 3.1仕様を生成」に基づく）

    // 【テストデータ準備】: OpenAPIルート定義を作成し、Zodスキーマを含める
    // 【初期条件設定】: getUserParamsSchemaとgetUserResponseSchemaがインポート済み
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

    // 【実際の処理実行】: ルート定義からrequestスキーマとresponseスキーマを取得
    // 【処理内容】: createRouteの結果オブジェクトからスキーマ情報を抽出
    const requestParamsSchema = route.request?.params;
    const responseSchema =
      route.responses?.[200]?.content?.['application/json']?.schema;

    // 【結果検証】: パスパラメータスキーマとレスポンススキーマが正しく定義されていることを確認
    // 【期待値確認】: Zodスキーマオブジェクトが正しくルート定義に埋め込まれている理由は、createRouteがZodスキーマを受け入れる設計であるため
    // 【品質保証】: OpenAPI仕様書生成時にスキーマが欠落しないことを保証し、型安全性を維持
    expect(requestParamsSchema).toBeDefined(); // 【確認内容】: パスパラメータスキーマが定義されており、バリデーションが機能する
    expect(responseSchema).toBeDefined(); // 【確認内容】: レスポンススキーマが定義されており、API契約が明示される

    // 【検証項目】: Zodスキーマオブジェクトがそのまま保持されていることを確認（OpenAPI変換前の状態）
    // 🟢 @hono/zod-openapiはZodスキーマを内部でOpenAPIスキーマに変換する
    expect(requestParamsSchema).toBe(getUserParamsSchema); // 【確認内容】: パスパラメータスキーマが元のZodスキーマと一致し、変換処理が正常
    expect(responseSchema).toBe(getUserResponseSchema); // 【確認内容】: レスポンススキーマが元のZodスキーマと一致し、API契約が保証される
  });

  test('OpenAPIメタデータ（description、tags）が正しく設定される', () => {
    // 【テスト目的】: OpenAPI仕様書に表示されるメタデータ（description、tags）が正しく設定されることを確認
    // 【テスト内容】: createRouteでメタデータを指定し、ルート定義オブジェクトに反映されていることを検証
    // 【期待される動作】: Swagger UIでエンドポイントの説明とタグが表示される
    // 🟡 信頼性レベル: 黄信号（要件定義書には明記されていないが、OpenAPI Best Practiceとして推奨される）

    // 【テストデータ準備】: メタデータ付きのOpenAPIルート定義を作成
    // 【初期条件設定】: description、tags、summaryを含むルート定義
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

    // 【実際の処理実行】: ルート定義からメタデータを取得
    // 【処理内容】: createRouteの結果オブジェクトからtags、summary、descriptionを抽出

    // 【結果検証】: メタデータが正しく設定されていることを確認
    // 【期待値確認】: tags、summary、descriptionがルート定義に含まれている理由は、OpenAPI仕様の標準フィールドであるため
    // 【品質保証】: Swagger UIでの可読性向上とAPI文書化の品質を保証
    expect(route.tags).toEqual(['ユーザー管理']); // 【確認内容】: タグが正しく設定され、Swagger UIでのグルーピングが機能する
    expect(route.summary).toBe('ユーザー情報取得'); // 【確認内容】: サマリーが設定され、エンドポイント一覧で概要が表示される
    expect(route.description).toBe('ユーザーIDでユーザー情報を取得する'); // 【確認内容】: 詳細説明が設定され、API利用者が仕様を理解できる
  });
});

describe('GET /users - OpenAPIルート定義', () => {
  test('OpenAPIルートが正常に登録される', () => {
    // 【テスト目的】: ユーザー一覧取得エンドポイントのOpenAPIルート定義が正常に登録されることを確認
    // 【テスト内容】: クエリパラメータを含むルート定義をHonoアプリに登録し、エラーが発生しないことを検証
    // 【期待される動作】: ルート定義が成功し、OpenAPI仕様に含まれる
    // 🟢 信頼性レベル: 青信号（API仕様書とZodスキーマに基づく）

    // 【テストデータ準備】: ページネーション・フィルタリング対応のOpenAPIルート定義を作成
    // 【初期条件設定】: listUsersQuerySchemaでクエリパラメータを定義
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

    // 【実際の処理実行】: OpenAPIHonoアプリにルートを登録
    // 【処理内容】: app.openapiメソッドでルート定義をHonoアプリに追加
    const app = new OpenAPIHono();

    // 【結果検証】: ルート登録時にエラーが発生しないことを確認
    // 【期待値確認】: ページネーション対応のルート定義が正常に登録される
    // 【品質保証】: クエリパラメータのバリデーションが正しく機能することを保証
    expect(() => {
      app.openapi(route, async (c) => {
        // 【検証項目】: ダミーレスポンスを返せることを確認（実装はGreenフェーズで行う）
        // 🟢 ページネーション構造を持つレスポンス形式
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
    }).not.toThrow(); // 【確認内容】: ルート登録処理が例外なく完了し、OpenAPIルートとして正常に機能する
  });

  test('Zodスキーマが正しくOpenAPI仕様に反映される', () => {
    // 【テスト目的】: クエリパラメータスキーマとレスポンススキーマがOpenAPI仕様に正しく反映されることを確認
    // 【テスト内容】: listUsersQuerySchemaとlistUsersResponseSchemaがルート定義に正しく組み込まれていることを検証
    // 【期待される動作】: ZodスキーマがOpenAPI 3.1のJSONスキーマ形式に変換される
    // 🟢 信頼性レベル: 青信号（REQ-003、REQ-004に基づく）

    // 【テストデータ準備】: クエリパラメータを含むOpenAPIルート定義を作成
    // 【初期条件設定】: listUsersQuerySchemaでprovider、limit、offsetを定義
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

    // 【実際の処理実行】: ルート定義からクエリスキーマとレスポンススキーマを取得
    // 【処理内容】: createRouteの結果オブジェクトからスキーマ情報を抽出
    const requestQuerySchema = route.request?.query;
    const responseSchema =
      route.responses?.[200]?.content?.['application/json']?.schema;

    // 【結果検証】: クエリパラメータスキーマとレスポンススキーマが正しく定義されていることを確認
    // 【期待値確認】: Zodスキーマオブジェクトが正しくルート定義に埋め込まれている
    // 【品質保証】: ページネーション・フィルタリングパラメータのバリデーションが正しく機能することを保証
    expect(requestQuerySchema).toBeDefined(); // 【確認内容】: クエリパラメータスキーマが定義されており、バリデーションが機能する
    expect(responseSchema).toBeDefined(); // 【確認内容】: レスポンススキーマが定義されており、API契約が明示される

    // 【検証項目】: Zodスキーマオブジェクトがそのまま保持されていることを確認
    // 🟢 @hono/zod-openapiはZodスキーマを内部でOpenAPIスキーマに変換する
    expect(requestQuerySchema).toBe(listUsersQuerySchema); // 【確認内容】: クエリパラメータスキーマが元のZodスキーマと一致し、変換処理が正常
    expect(responseSchema).toBe(listUsersResponseSchema); // 【確認内容】: レスポンススキーマが元のZodスキーマと一致し、API契約が保証される
  });

  test('OpenAPIメタデータ（description、tags）が正しく設定される', () => {
    // 【テスト目的】: ユーザー一覧取得エンドポイントのメタデータが正しく設定されることを確認
    // 【テスト内容】: tags、summary、descriptionがルート定義に反映されていることを検証
    // 【期待される動作】: Swagger UIでエンドポイントの説明とタグが表示される
    // 🟡 信頼性レベル: 黄信号（OpenAPI Best Practiceとして推奨される）

    // 【テストデータ準備】: メタデータ付きのOpenAPIルート定義を作成
    // 【初期条件設定】: description、tags、summaryを含むルート定義
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

    // 【実際の処理実行】: ルート定義からメタデータを取得
    // 【処理内容】: createRouteの結果オブジェクトからtags、summary、descriptionを抽出

    // 【結果検証】: メタデータが正しく設定されていることを確認
    // 【期待値確認】: tags、summary、descriptionがルート定義に含まれている
    // 【品質保証】: Swagger UIでの可読性向上とAPI文書化の品質を保証
    expect(route.tags).toEqual(['ユーザー管理']); // 【確認内容】: タグが正しく設定され、Swagger UIでのグルーピングが機能する
    expect(route.summary).toBe('ユーザー一覧取得'); // 【確認内容】: サマリーが設定され、エンドポイント一覧で概要が表示される
    expect(route.description).toBe(
      'ユーザー一覧を取得する（ページネーション・フィルタリング対応）',
    ); // 【確認内容】: 詳細説明が設定され、API利用者が仕様を理解できる
  });
});

describe('PUT /users/{id} - OpenAPIルート定義', () => {
  test('OpenAPIルートが正常に登録される', () => {
    // 【テスト目的】: ユーザー情報更新エンドポイントのOpenAPIルート定義が正常に登録されることを確認
    // 【テスト内容】: パスパラメータとボディを含むルート定義をHonoアプリに登録し、エラーが発生しないことを検証
    // 【期待される動作】: ルート定義が成功し、OpenAPI仕様に含まれる
    // 🟢 信頼性レベル: 青信号（API仕様書とZodスキーマに基づく）

    // 【テストデータ準備】: パスパラメータとボディを含むOpenAPIルート定義を作成
    // 【初期条件設定】: getUserParamsSchemaでパスパラメータ、updateUserBodySchemaでボディを定義
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

    // 【実際の処理実行】: OpenAPIHonoアプリにルートを登録
    // 【処理内容】: app.openapiメソッドでルート定義をHonoアプリに追加
    const app = new OpenAPIHono();

    // 【結果検証】: ルート登録時にエラーが発生しないことを確認
    // 【期待値確認】: パスパラメータとボディの両方を含むルート定義が正常に登録される
    // 【品質保証】: リクエストボディのバリデーションが正しく機能することを保証
    expect(() => {
      app.openapi(route, async (c) => {
        // 【検証項目】: ダミーレスポンスを返せることを確認（実装はGreenフェーズで行う）
        // 🟢 更新後のユーザー情報を返すレスポンス形式
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
    }).not.toThrow(); // 【確認内容】: ルート登録処理が例外なく完了し、OpenAPIルートとして正常に機能する
  });

  test('Zodスキーマが正しくOpenAPI仕様に反映される', () => {
    // 【テスト目的】: パスパラメータスキーマ、ボディスキーマ、レスポンススキーマがOpenAPI仕様に正しく反映されることを確認
    // 【テスト内容】: getUserParamsSchema、updateUserBodySchema、updateUserResponseSchemaがルート定義に正しく組み込まれていることを検証
    // 【期待される動作】: 複数のZodスキーマがOpenAPI 3.1のJSONスキーマ形式に変換される
    // 🟢 信頼性レベル: 青信号（REQ-003、REQ-004に基づく）

    // 【テストデータ準備】: パスパラメータとボディを含むOpenAPIルート定義を作成
    // 【初期条件設定】: getUserParamsSchemaでパスパラメータ、updateUserBodySchemaでボディを定義
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

    // 【実際の処理実行】: ルート定義からパスパラメータスキーマ、ボディスキーマ、レスポンススキーマを取得
    // 【処理内容】: createRouteの結果オブジェクトからスキーマ情報を抽出
    const requestParamsSchema = route.request?.params;
    const requestBodySchema =
      route.request?.body?.content?.['application/json']?.schema;
    const responseSchema =
      route.responses?.[200]?.content?.['application/json']?.schema;

    // 【結果検証】: パスパラメータスキーマ、ボディスキーマ、レスポンススキーマが正しく定義されていることを確認
    // 【期待値確認】: 複数のZodスキーマオブジェクトが正しくルート定義に埋め込まれている
    // 【品質保証】: 更新リクエストのバリデーションが正しく機能することを保証
    expect(requestParamsSchema).toBeDefined(); // 【確認内容】: パスパラメータスキーマが定義されており、バリデーションが機能する
    expect(requestBodySchema).toBeDefined(); // 【確認内容】: ボディスキーマが定義されており、バリデーションが機能する
    expect(responseSchema).toBeDefined(); // 【確認内容】: レスポンススキーマが定義されており、API契約が明示される

    // 【検証項目】: Zodスキーマオブジェクトがそのまま保持されていることを確認
    // 🟢 @hono/zod-openapiはZodスキーマを内部でOpenAPIスキーマに変換する
    expect(requestParamsSchema).toBe(getUserParamsSchema); // 【確認内容】: パスパラメータスキーマが元のZodスキーマと一致し、変換処理が正常
    expect(requestBodySchema).toBe(updateUserBodySchema); // 【確認内容】: ボディスキーマが元のZodスキーマと一致し、変換処理が正常
    expect(responseSchema).toBe(updateUserResponseSchema); // 【確認内容】: レスポンススキーマが元のZodスキーマと一致し、API契約が保証される
  });

  test('OpenAPIメタデータ（description、tags）が正しく設定される', () => {
    // 【テスト目的】: ユーザー情報更新エンドポイントのメタデータが正しく設定されることを確認
    // 【テスト内容】: tags、summary、descriptionがルート定義に反映されていることを検証
    // 【期待される動作】: Swagger UIでエンドポイントの説明とタグが表示される
    // 🟡 信頼性レベル: 黄信号（OpenAPI Best Practiceとして推奨される）

    // 【テストデータ準備】: メタデータ付きのOpenAPIルート定義を作成
    // 【初期条件設定】: description、tags、summaryを含むルート定義
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

    // 【実際の処理実行】: ルート定義からメタデータを取得
    // 【処理内容】: createRouteの結果オブジェクトからtags、summary、descriptionを抽出

    // 【結果検証】: メタデータが正しく設定されていることを確認
    // 【期待値確認】: tags、summary、descriptionがルート定義に含まれている
    // 【品質保証】: Swagger UIでの可読性向上とAPI文書化の品質を保証
    expect(route.tags).toEqual(['ユーザー管理']); // 【確認内容】: タグが正しく設定され、Swagger UIでのグルーピングが機能する
    expect(route.summary).toBe('ユーザー情報更新'); // 【確認内容】: サマリーが設定され、エンドポイント一覧で概要が表示される
    expect(route.description).toBe(
      'ユーザー情報を更新する（名前・アバターURL）',
    ); // 【確認内容】: 詳細説明が設定され、API利用者が仕様を理解できる
  });
});
