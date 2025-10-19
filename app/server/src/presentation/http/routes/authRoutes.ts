import { randomUUID } from 'node:crypto';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import {
  authCallbackRequestSchema,
  authCallbackResponseSchema,
} from '@/packages/shared-schemas/src/auth';
import { apiErrorResponseSchema } from '@/packages/shared-schemas/src/common';
import { AuthController } from '../controllers/AuthController';

/**
 * 認証APIルート定義
 *
 * JWT検証とOpenAPI対応の認証コールバックを提供。
 * - POST /auth/verify: JWT検証エンドポイント（互換性維持）
 * - POST /auth/callback: OpenAPI対応認証コールバック
 *
 * @example
 * ```typescript
 * import auth from './authRoutes';
 * app.route('/api', auth);
 * ```
 */
const auth = new OpenAPIHono({
  /**
   * Zodバリデーションエラーのカスタムハンドラ
   *
   * バリデーションエラーをapiErrorResponseSchema形式に変換し、
   * フィールド単位の詳細エラー情報を返却する。
   */
  defaultHook: (result, c) => {
    if (result.success) {
      return;
    }

    // Zodエラーをフィールド単位のエラーマップに変換
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
 * OpenAPIルート定義: POST /auth/callback
 *
 * Supabase認証後のコールバック処理。
 * Zodスキーマによる自動バリデーションとOpenAPI仕様生成を提供。
 */
const authCallbackRoute = createRoute({
  method: 'post',
  path: '/auth/callback',
  tags: ['認証'],
  summary: 'Supabase認証後のコールバック処理',
  description:
    'Supabase認証後のユーザー情報を受け取り、ユーザー作成または更新を行う',
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
 * POST /auth/callback ハンドラ
 *
 * 認証プロバイダーからのコールバック情報を処理し、ユーザーを作成または更新。
 * リクエストバリデーションは@hono/zod-openapiが自動実行。
 *
 * @returns 200: 認証成功、400: バリデーションエラー、500: サーバーエラー
 */
auth.openapi(authCallbackRoute, async (c) => {
  try {
    const validatedBody = c.req.valid('json');

    // RFC 4122準拠のUUID v4を生成（NFR-001: 50ms以内を満たす）
    const userResponse = {
      success: true as const,
      data: {
        id: randomUUID(),
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

    // TODO: AuthenticateUserUseCaseを呼び出し、実際のDB操作を実装（TASK-904）
    return c.json(userResponse, 200);
  } catch (error) {
    // セキュリティイベントをログに記録（NFR-303: 内部詳細を隠蔽）
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
