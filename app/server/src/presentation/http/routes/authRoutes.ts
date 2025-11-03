import { randomUUID } from 'node:crypto';
import { OpenAPIHono } from '@hono/zod-openapi';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import { formatZodError } from '@/shared/utils/zodErrorFormatter';
import { AuthController } from '../controllers/AuthController';
import { authCallbackRoute } from './authRoutes.schema';

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

    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
          details: formatZodError(result.error.issues),
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
