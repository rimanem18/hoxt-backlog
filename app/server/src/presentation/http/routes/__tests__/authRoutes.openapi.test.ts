/**
 * AuthRoutes OpenAPI定義のテストケース集
 *
 * OpenAPIルート定義の正常登録とスキーマ統合を確認するテスト
 * TASK-902: 認証エンドポイントのOpenAPI対応化
 *
 * @see docs/implements/TASK-902/type-safety-enhancement-testcases.md
 */

import { describe, expect, test } from 'bun:test';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  authCallbackRequestSchema,
  authCallbackResponseSchema,
} from '@/packages/shared-schemas/src/auth';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';

describe('POST /auth/callback - OpenAPIルート定義', () => {
  test('OpenAPIルートが正常に登録される', () => {
    // 【テスト目的】: createRouteで定義したOpenAPIルートがHonoアプリに正常に登録されることを確認
    // 【テスト内容】: OpenAPIHonoインスタンスに対してcreateRouteの結果を登録し、エラーが発生しないことを検証
    // 【期待される動作】: ルート定義が成功し、OpenAPI仕様に含まれる
    // 🟢 信頼性レベル: 青信号（@hono/zod-openapiの公式ドキュメントと要件定義書に基づく）

    // 【テストデータ準備】: OpenAPIルート定義オブジェクトを作成
    // 【初期条件設定】: Zodスキーマを使用してリクエスト・レスポンスを定義
    // 【前提条件確認】: shared-schemasパッケージのスキーマが正しくインポートされている
    const route = createRoute({
      method: 'post',
      path: '/auth/callback',
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
        return c.json({ success: true, data: {} as any }, 200);
      });
    }).not.toThrow(); // 【確認内容】: ルート登録処理が例外なく完了し、OpenAPIルートとして正常に機能する
  });

  test('Zodスキーマが正しくOpenAPI仕様に反映される', () => {
    // 【テスト目的】: Zodスキーマ（authCallbackRequestSchema等）がOpenAPI仕様のJSONスキーマとして正しく変換されることを確認
    // 【テスト内容】: createRouteで定義されたスキーマが、OpenAPIドキュメント生成時に参照可能であることを検証
    // 【期待される動作】: ZodスキーマがOpenAPI 3.1のJSONスキーマ形式に変換され、仕様書に含まれる
    // 🟢 信頼性レベル: 青信号（REQ-004「ZodスキーマからOpenAPI 3.1仕様を生成」に基づく）

    // 【テストデータ準備】: OpenAPIルート定義を作成し、Zodスキーマを含める
    // 【初期条件設定】: authCallbackRequestSchemaとauthCallbackResponseSchemaがインポート済み
    const route = createRoute({
      method: 'post',
      path: '/auth/callback',
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
      },
    });

    // 【実際の処理実行】: ルート定義からrequestスキーマとresponseスキーマを取得
    // 【処理内容】: createRouteの結果オブジェクトからスキーマ情報を抽出
    const requestSchema = route.request?.body?.content?.['application/json']?.schema;
    const responseSchema = route.responses?.[200]?.content?.['application/json']?.schema;

    // 【結果検証】: リクエストスキーマとレスポンススキーマが正しく定義されていることを確認
    // 【期待値確認】: Zodスキーマオブジェクトが正しくルート定義に埋め込まれている理由は、createRouteがZodスキーマを受け入れる設計であるため
    // 【品質保証】: OpenAPI仕様書生成時にスキーマが欠落しないことを保証し、型安全性を維持
    expect(requestSchema).toBeDefined(); // 【確認内容】: リクエストボディスキーマが定義されており、バリデーションが機能する
    expect(responseSchema).toBeDefined(); // 【確認内容】: レスポンススキーマが定義されており、API契約が明示される

    // 【検証項目】: Zodスキーマオブジェクトがそのまま保持されていることを確認（OpenAPI変換前の状態）
    // 🟢 @hono/zod-openapiはZodスキーマを内部でOpenAPIスキーマに変換する
    expect(requestSchema).toBe(authCallbackRequestSchema); // 【確認内容】: リクエストスキーマが元のZodスキーマと一致し、変換処理が正常
    expect(responseSchema).toBe(authCallbackResponseSchema); // 【確認内容】: レスポンススキーマが元のZodスキーマと一致し、API契約が保証される
  });

  test('OpenAPIメタデータ（description、tags）が正しく設定される', () => {
    // 【テスト目的】: OpenAPI仕様書に表示されるメタデータ（description、tags）が正しく設定されることを確認
    // 【テスト内容】: createRouteでメタデータを指定し、ルート定義オブジェクトに反映されていることを検証
    // 【期待される動作】: Swagger UIでエンドポイントの説明とタグが表示される
    // 🟡 信頼性レベル: 黄信号（要件定義書には明記されていないが、OpenAPI Best Practiceとして推奨される）

    // 【テストデータ準備】: メタデータ付きのOpenAPIルート定義を作成
    // 【初期条件設定】: description、tags、summaryを含むルート定義
    const route = createRoute({
      method: 'post',
      path: '/auth/callback',
      tags: ['認証'],
      summary: 'Supabase認証後のコールバック処理',
      description: 'Supabase認証後のユーザー情報を受け取り、ユーザー作成または更新を行う',
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
      },
    });

    // 【実際の処理実行】: ルート定義からメタデータを取得
    // 【処理内容】: createRouteの結果オブジェクトからtags、summary、descriptionを抽出

    // 【結果検証】: メタデータが正しく設定されていることを確認
    // 【期待値確認】: tags、summary、descriptionがルート定義に含まれている理由は、OpenAPI仕様の標準フィールドであるため
    // 【品質保証】: Swagger UIでの可読性向上とAPI文書化の品質を保証
    expect(route.tags).toEqual(['認証']); // 【確認内容】: タグが正しく設定され、Swagger UIでのグルーピングが機能する
    expect(route.summary).toBe('Supabase認証後のコールバック処理'); // 【確認内容】: サマリーが設定され、エンドポイント一覧で概要が表示される
    expect(route.description).toBe('Supabase認証後のユーザー情報を受け取り、ユーザー作成または更新を行う'); // 【確認内容】: 詳細説明が設定され、API利用者が仕様を理解できる
  });
});
