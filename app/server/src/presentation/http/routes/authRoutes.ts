import { Hono } from 'hono';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { randomUUID } from 'node:crypto';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import { AuthController } from '../controllers/AuthController';
import {
  authCallbackRequestSchema,
  authCallbackResponseSchema,
} from '@/packages/shared-schemas/src/auth';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';

/**
 * Auth API のルート定義
 *
 * 【機能概要】: 認証関連のエンドポイントを提供
 * - POST /auth/verify: 既存のJWT検証エンドポイント（互換性維持）
 * - POST /auth/callback: OpenAPI対応の認証コールバックエンドポイント
 *
 * 【実装方針】: OpenAPIHonoとHonoを併用し、段階的に移行可能にする
 * 🟢 信頼性レベル: 青信号（要件定義書とTDDメモに基づく）
 */
const auth = new OpenAPIHono({
  /**
   * 【Zodバリデーションエラーハンドリング】: デフォルトのフックをカスタマイズ
   *
   * 【機能概要】: Zodバリデーションエラー時に、テストで期待される形式のエラーレスポンスを返す
   * 【実装方針】: defaultHookでZodエラーを捕捉し、apiErrorResponseSchema形式に変換
   * 【テスト対応】: バリデーションエラーテストケース（EDGE-001〜EDGE-004）を通すための実装
   * 🟡 信頼性レベル: 黄信号（@hono/zod-openapiのdefaultHookパターンは推測）
   */
  defaultHook: (result, c) => {
    // 【バリデーション成功時】: 何もせずに処理を継続
    if (result.success) {
      return;
    }

    // 【バリデーションエラー時】: テストで期待される形式でエラーを返す
    // 🟢 apiErrorResponseSchemaに基づく形式
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
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

auth.post('/auth/verify', async (c) => {
  try {
    // DIコンテナから依存関係を取得
    const authenticateUserUseCase =
      AuthDIContainer.getAuthenticateUserUseCase();

    // AuthControllerインスタンスを生成
    const authController = new AuthController(authenticateUserUseCase);

    // JWT検証・認証処理を実行
    return await authController.verifyToken(c);
  } catch (error) {
    // セキュリティイベントをログに記録
    console.error('[SECURITY] Unexpected error in auth endpoint:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/auth/verify',
    });

    // 内部実装を隠蔽したエラーレスポンス
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '一時的にサービスが利用できません',
        },
      },
      500,
    );
  }
});

/**
 * 【OpenAPIルート定義】: POST /auth/callback エンドポイント
 *
 * 【機能概要】: Supabase認証後のコールバック処理を行う
 * 【実装方針】: createRouteでZodスキーマを統合し、自動バリデーションを実現
 * 【テスト対応】: authRoutes.openapi.test.tsとauthRoutes.integration.test.tsのテストケースを通す
 * 🟢 信頼性レベル: 青信号（要件定義書のREQ-004、TDDメモに基づく）
 */
const authCallbackRoute = createRoute({
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

/**
 * 【OpenAPIルートハンドラ】: POST /auth/callback の実装
 *
 * 【機能概要】: 認証プロバイダーからのコールバック情報を処理し、ユーザーを作成または更新
 * 【実装方針】: 最小限の実装でテストを通すことを優先（Greenフェーズの原則）
 * 【処理フロー】:
 *   1. リクエストボディのバリデーション（@hono/zod-openapiが自動実行）
 *   2. TODO: AuthenticateUserUseCaseを呼び出し（現時点では未実装のため、ダミーレスポンスを返す）
 *   3. レスポンス生成（成功時200、エラー時400/500）
 * 【テスト対応】: 統合テスト14ケースを通すための実装
 * 🟡 信頼性レベル: 黄信号（UseCaseの呼び出しパターンは推測、実際の実装は次のステップで確認）
 */
auth.openapi(authCallbackRoute, async (c) => {
  try {
    // 【バリデーション済みデータ取得】: @hono/zod-openapiが自動バリデーション済みのデータを取得
    // 🟢 この実装パターンは@hono/zod-openapiの公式ドキュメントに基づく
    const validatedBody = c.req.valid('json');

    // 【セキュリティ強化】: 暗号学的に安全なUUID v4を生成
    // 【改善内容】: Greenフェーズの固定UUID（00000000-...）を実際のUUID生成に変更
    // 【パフォーマンス】: randomUUID()は1-2msのオーバーヘッドだが、NFR-001（50ms以内）を満たす
    // 🟢 Node.js標準のrandomUUID()（RFC 4122準拠）を使用
    const userResponse = {
      success: true as const,
      data: {
        id: randomUUID(), // 【UUID v4生成】: 各ユーザーに一意のIDを割り当て
        externalId: validatedBody.externalId,
        provider: validatedBody.provider,
        email: validatedBody.email,
        name: validatedBody.name,
        avatarUrl: validatedBody.avatarUrl ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
    };

    // 【成功レスポンス返却】: 200 OKでレスポンスを返す
    // 【TODO (次タスク)】: AuthenticateUserUseCaseを呼び出し、実際のDB操作を実装
    // 🟡 現時点では、テストを通すための最小実装を維持（Refactorフェーズの範囲）
    return c.json(userResponse, 200);
  } catch (error) {
    // 【エラーハンドリング】: 予期しないエラーの場合は500を返す
    // 【セキュリティ】: 内部実装を隠蔽したエラーメッセージを返却（NFR-303に基づく）
    // 【ログ記録】: セキュリティイベントとして記録し、監視・分析を可能にする
    // 🟢 信頼性レベル: 青信号（要件定義書のNFR-303に基づく）
    console.error('[SECURITY] Unexpected error in auth callback endpoint:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/auth/callback',
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '一時的にサービスが利用できません',
        },
      },
      500,
    );
  }
});

export default auth;
