import { Hono } from 'hono';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import { AuthController } from '../controllers/AuthController';

/**
 * Auth API のルート定義
 *
 * POST /auth/verify エンドポイントを提供する。
 * DIコンテナによる依存性注入とJWT検証処理を実装。
 */
const auth = new Hono();

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

export default auth;
