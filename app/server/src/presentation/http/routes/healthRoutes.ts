import { Hono } from 'hono';
import { HealthDIContainer } from '@/infrastructure/di/HealthDIContainer';

/**
 * ヘルスチェックAPIルート実装
 *
 * システム監視エンドポイントを提供し、
 * HTTPリクエストをUseCaseに委譲するPresentation層の実装。
 */
const health = new Hono();

// GET /api/health - システムヘルスチェック
health.get('/health', async (c) => {
  try {
    const healthCheckUseCase = HealthDIContainer.getHealthCheckUseCase();
    const { result, httpStatus } = await healthCheckUseCase.execute();

    // HTTPステータスに基づいてレスポンス形式を決定
    if (httpStatus === 200) {
      return c.json(
        {
          success: true,
          data: result,
        },
        httpStatus,
      );
    } else {
      return c.json(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'サービスが一時的に利用できません',
            details: `Database: ${result.dependencies.database}, Supabase: ${result.dependencies.supabase}`,
          },
        },
        httpStatus,
      );
    }
  } catch (error) {
    console.error('[Health] Unexpected server error:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/health',
    });

    // 例外発生時は汎用エラーレスポンスを返却
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

export default health;
