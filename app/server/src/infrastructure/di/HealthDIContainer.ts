import { HealthCheckUseCase } from '@/application/usecases/HealthCheckUseCase';
import { SupabaseAuthProvider } from '@/infrastructure/auth/SupabaseAuthProvider';
import { HealthCheckService } from '@/infrastructure/config/HealthCheckService';
import type { Logger } from '@/shared/logging/Logger';

/**
 * システムヘルスチェック専用DIコンテナ実装
 *
 * システム監視・ヘルスチェック関連の依存性注入を管理し、
 * 認証ドメインから分離された独立したヘルスチェックドメインを提供する。
 */
export class HealthDIContainer {
  private static healthCheckUseCaseInstance: HealthCheckUseCase | null = null;
  private static healthCheckServiceInstance: HealthCheckService | null = null;
  private static authProviderInstance: SupabaseAuthProvider | null = null;
  private static loggerInstance: Logger | null = null;

  /**
   * HealthCheckUseCaseのシングルトンインスタンスを取得する
   *
   * @returns HealthCheckUseCaseインスタンス
   */
  static getHealthCheckUseCase(): HealthCheckUseCase {
    if (!HealthDIContainer.healthCheckUseCaseInstance) {
      const healthCheckService = HealthDIContainer.getHealthCheckService();

      HealthDIContainer.healthCheckUseCaseInstance = new HealthCheckUseCase(
        healthCheckService,
      );
    }

    return HealthDIContainer.healthCheckUseCaseInstance;
  }

  /**
   * HealthCheckServiceのシングルトンインスタンスを取得する
   *
   * @returns HealthCheckServiceインスタンス
   */
  private static getHealthCheckService(): HealthCheckService {
    if (!HealthDIContainer.healthCheckServiceInstance) {
      // ヘルスチェック用AuthProviderを注入
      const authProvider = HealthDIContainer.getAuthProvider();

      HealthDIContainer.healthCheckServiceInstance = new HealthCheckService(
        authProvider,
      );
    }

    return HealthDIContainer.healthCheckServiceInstance;
  }

  /**
   * ヘルスチェック用SupabaseAuthProviderのシングルトンインスタンスを取得する
   *
   * @returns SupabaseAuthProviderインスタンス
   */
  private static getAuthProvider(): SupabaseAuthProvider {
    if (!HealthDIContainer.authProviderInstance) {
      HealthDIContainer.authProviderInstance = new SupabaseAuthProvider();
    }

    return HealthDIContainer.authProviderInstance;
  }

  /**
   * ヘルスチェック専用Loggerのシングルトンインスタンスを取得する
   *
   * @returns Loggerインスタンス
   */
  static getLogger(): Logger {
    if (!HealthDIContainer.loggerInstance) {
      HealthDIContainer.loggerInstance = {
        info: (message: string, meta?: unknown) => {
          const timestamp = new Date().toISOString();
          const logData = {
            timestamp,
            level: 'INFO',
            service: 'HEALTH',
            message,
            meta,
          };
          console.log(JSON.stringify(logData));
        },
        warn: (message: string, meta?: unknown) => {
          const timestamp = new Date().toISOString();
          const logData = {
            timestamp,
            level: 'WARN',
            service: 'HEALTH',
            message,
            meta,
          };
          console.warn(JSON.stringify(logData));
        },
        error: (message: string, meta?: unknown) => {
          const timestamp = new Date().toISOString();
          const logData = {
            timestamp,
            level: 'ERROR',
            service: 'HEALTH',
            message,
            meta,
          };
          console.error(JSON.stringify(logData));
        },
        debug: (message: string, meta?: unknown) => {
          if (process.env.NODE_ENV !== 'production') {
            const timestamp = new Date().toISOString();
            const logData = {
              timestamp,
              level: 'DEBUG',
              service: 'HEALTH',
              message,
              meta,
            };
            console.debug(JSON.stringify(logData));
          }
        },
      };
    }

    if (!HealthDIContainer.loggerInstance) {
      throw new Error('Health Logger instance not initialized');
    }
    return HealthDIContainer.loggerInstance;
  }

  /**
   * テスト用HealthCheckUseCaseを生成する
   *
   * @param mockHealthCheckService モック用HealthCheckService
   * @returns テスト用HealthCheckUseCaseインスタンス
   */
  static getTestHealthCheckUseCase(
    mockHealthCheckService?: HealthCheckService,
  ): HealthCheckUseCase {
    const testHealthCheckService =
      mockHealthCheckService || HealthDIContainer.getHealthCheckService();

    return new HealthCheckUseCase(testHealthCheckService);
  }

  /**
   * テスト時の全インスタンスをリセットする
   */
  static resetInstances(): void {
    HealthDIContainer.healthCheckUseCaseInstance = null;
    HealthDIContainer.healthCheckServiceInstance = null;
    HealthDIContainer.authProviderInstance = null;
    HealthDIContainer.loggerInstance = null;
  }

  // TODO: 将来拡張予定のメソッド
  // - getMetricsService(): MetricsService
  // - getAlertService(): AlertService
  // - getPerformanceMonitorUseCase(): PerformanceMonitorUseCase
  // - getLogAggregatorService(): LogAggregatorService
}
