import type { HealthCheckService } from '@/infrastructure/config/HealthCheckService';

/**
 * システムヘルスチェック UseCase実装
 *
 * データベース・Supabase接続確認からHTTPステータス決定までの
 * システム監視ビジネスフローを管理するApplication層のUseCase実装。
 */
export class HealthCheckUseCase {
  private healthCheckService: HealthCheckService;

  constructor(healthCheckService: HealthCheckService) {
    this.healthCheckService = healthCheckService;
  }

  /**
   * システム全体のヘルスチェックを実行する
   *
   * @returns ヘルスチェック結果とHTTPステータスコード
   */
  async execute(): Promise<{
    result: {
      status: 'healthy' | 'unhealthy';
      timestamp: string;
      version: string;
      dependencies: {
        database: 'healthy' | 'unhealthy';
        supabase: 'healthy' | 'unhealthy';
      };
    };
    httpStatus: 200 | 503;
  }> {
    try {
      const result = await this.healthCheckService.checkOverallHealth();

      // システム健全性に基づいてHTTPステータスを決定
      const httpStatus = result.status === 'healthy' ? 200 : 503;

      return {
        result,
        httpStatus,
      };
    } catch (error) {
      // 例外発生時は全依存関係をunhealthyとして扱う
      console.error('Health check use case failed:', error);

      return {
        result: {
          status: 'unhealthy' as const,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          dependencies: {
            database: 'unhealthy' as const,
            supabase: 'unhealthy' as const,
          },
        },
        httpStatus: 503,
      };
    }
  }
}
