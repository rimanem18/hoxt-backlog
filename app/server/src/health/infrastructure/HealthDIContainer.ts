import { HealthCheckUseCase } from '@/health/application/HealthCheckUseCase';
import { HealthCheckService } from '@/health/infrastructure/HealthCheckService';
import type { Logger } from '@/shared/logging/Logger';

/**
 * システムヘルスチェック専用DIコンテナ実装
 *
 * システム監視・ヘルスチェック関連の依存性注入を管理し、
 * 独立したヘルスチェックドメインを提供する。
 */
export class HealthDIContainer {
  private static healthCheckUseCaseInstance: HealthCheckUseCase | null = null;
  private static healthCheckServiceInstance: HealthCheckService | null = null;
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
      HealthDIContainer.healthCheckServiceInstance = new HealthCheckService();
    }

    return HealthDIContainer.healthCheckServiceInstance;
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
   * テスト用のインスタンスリセット機能
   *
   * テスト環境専用。テスト間のインスタンス汚染を防ぐ
   */
  static resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTesting is only available in test environment');
    }

    HealthDIContainer.healthCheckUseCaseInstance = null;
    HealthDIContainer.healthCheckServiceInstance = null;
    HealthDIContainer.loggerInstance = null;
  }
}
