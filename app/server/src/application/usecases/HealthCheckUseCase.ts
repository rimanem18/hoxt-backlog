import type { HealthCheckService } from '@/infrastructure/config/HealthCheckService';

/**
 * ヘルスチェック UseCase
 *
 * システムの稼働状態確認のユースケース。
 * アプリケーション層としてInfrastructure層のHealthCheckServiceを調整し、
 * ビジネスロジックに基づいたヘルスチェックを実行する。
 */
export class HealthCheckUseCase {
  private healthCheckService: HealthCheckService;

  constructor(healthCheckService: HealthCheckService) {
    this.healthCheckService = healthCheckService;
  }

  /**
   * システムヘルスチェック実行
   *
   * データベースとSupabaseの健全性を確認し、
   * システム全体の稼働状態を判定する。
   * エラーが発生した場合も適切にハンドリングして結果を返却する。
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

      // すべての依存関係が健全な場合は200、そうでなければ503
      const httpStatus = result.status === 'healthy' ? 200 : 503;

      return {
        result,
        httpStatus,
      };
    } catch (error) {
      // 予期しないエラーが発生した場合は全て unhealthy として扱う
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
