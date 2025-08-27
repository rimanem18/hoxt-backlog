import { Hono } from 'hono';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';

/**
 * Health API のルート定義
 * プレゼンテーション層として、HTTPリクエストをユースケースに委譲する
 */
const health = new Hono();

// ヘルスチェックエンドポイント
// ステータスコードを 200 or 503 で明示
health.get('/health', async (c) => {
  try {
    // DIコンテナから適切に構築されたUseCaseを取得
    const healthCheckUseCase = AuthDIContainer.getHealthCheckUseCase();
    const { result, httpStatus } = await healthCheckUseCase.execute();

    // API仕様に準拠したレスポンス形式
    if (httpStatus === 200) {
      return c.json({
        success: true,
        data: result
      }, httpStatus);
    } else {
      return c.json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'サービスが一時的に利用できません',
          details: `Database: ${result.dependencies.database}, Supabase: ${result.dependencies.supabase}`
        }
      }, httpStatus);
    }
  } catch(error) {
    console.error('[Health] サーバーがなんか変です:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/health',
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

export default health;
