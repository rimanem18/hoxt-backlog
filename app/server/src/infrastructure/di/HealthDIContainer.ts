import { HealthCheckUseCase } from '@/application/usecases/HealthCheckUseCase';
import { SupabaseAuthProvider } from '@/infrastructure/auth/SupabaseAuthProvider';
import { HealthCheckService } from '@/infrastructure/config/HealthCheckService';
import type { Logger } from '@/shared/logging/Logger';

/**
 * 【機能概要】: システム監視・ヘルスチェック関連の依存性注入を管理するDIコンテナ
 * 【設計方針】: 認証ドメインから分離した独立したヘルスチェックドメインを管理
 * 【拡張性】: 将来のメトリクス監視・ログ集約・アラート機能の基盤
 * 【責任範囲】: システム監視・インフラ健全性確認・運用支援機能
 * 🟢 信頼性レベル: ドメイン分離による保守性向上を重視した設計
 */
export class HealthDIContainer {
  private static healthCheckUseCaseInstance: HealthCheckUseCase | null = null;
  private static healthCheckServiceInstance: HealthCheckService | null = null;
  private static authProviderInstance: SupabaseAuthProvider | null = null;
  private static loggerInstance: Logger | null = null;

  /**
   * 【機能概要】: HealthCheckUseCaseのインスタンスを返す
   * 【設計方針】: システム監視専用のユースケース管理
   * 【パフォーマンス】: シングルトン管理によりリクエストごとのインスタンス生成を回避
   * 【保守性】: ヘルスチェック関連の依存関係を一元管理
   * 🟢 信頼性レベル: ドメイン分離による責任明確化
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
   * 【機能概要】: HealthCheckServiceの共有インスタンスを返す
   * 【設計方針】: インフラ層のヘルスチェック機能を管理
   * 【拡張予定】: メトリクス収集・パフォーマンス監視機能の統合基盤
   * 🟢 信頼性レベル: 既存実装を基にした安定した設計
   */
  private static getHealthCheckService(): HealthCheckService {
    if (!HealthDIContainer.healthCheckServiceInstance) {
      // AuthProviderは共有リソースとして利用（認証ドメインとの連携）
      const authProvider = HealthDIContainer.getAuthProvider();

      HealthDIContainer.healthCheckServiceInstance = new HealthCheckService(
        authProvider,
      );
    }

    return HealthDIContainer.healthCheckServiceInstance;
  }

  /**
   * 【機能概要】: ヘルスチェック用のSupabaseAuthProviderインスタンス
   * 【設計方針】: 認証プロバイダーの接続確認専用インスタンス
   * 【注意】: 認証処理とは分離されたヘルスチェック専用用途
   * 🟡 将来改善: 認証とヘルスチェックでインスタンス分離の検討
   */
  private static getAuthProvider(): SupabaseAuthProvider {
    if (!HealthDIContainer.authProviderInstance) {
      HealthDIContainer.authProviderInstance = new SupabaseAuthProvider();
    }

    return HealthDIContainer.authProviderInstance;
  }

  /**
   * 【機能概要】: ヘルスチェック専用のLoggerインスタンス
   * 【設計方針】: システム監視ログの統一管理
   * 【拡張予定】: メトリクス出力・アラート連携機能
   * 🟡 信頼性レベル: Console基盤の暫定実装
   */
  static getLogger(): Logger {
    if (!HealthDIContainer.loggerInstance) {
      HealthDIContainer.loggerInstance = {
        info: (message: string, meta?: unknown) => {
          const timestamp = new Date().toISOString();
          const logData = { timestamp, level: 'INFO', service: 'HEALTH', message, meta };
          console.log(JSON.stringify(logData));
        },
        warn: (message: string, meta?: unknown) => {
          const timestamp = new Date().toISOString();
          const logData = { timestamp, level: 'WARN', service: 'HEALTH', message, meta };
          console.warn(JSON.stringify(logData));
        },
        error: (message: string, meta?: unknown) => {
          const timestamp = new Date().toISOString();
          const logData = { timestamp, level: 'ERROR', service: 'HEALTH', message, meta };
          console.error(JSON.stringify(logData));
        },
        debug: (message: string, meta?: unknown) => {
          if (process.env.NODE_ENV !== 'production') {
            const timestamp = new Date().toISOString();
            const logData = { timestamp, level: 'DEBUG', service: 'HEALTH', message, meta };
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
   * 【機能概要】: テスト専用のヘルスチェック機能
   * 【設計方針】: テスト時のモック注入を支援
   */
  static getTestHealthCheckUseCase(
    mockHealthCheckService?: HealthCheckService,
    mockLogger?: Logger,
  ): HealthCheckUseCase {
    const testHealthCheckService = mockHealthCheckService || HealthDIContainer.getHealthCheckService();

    return new HealthCheckUseCase(testHealthCheckService);
  }

  /**
   * 【機能概要】: テスト時のインスタンスリセット
   * 【設計方針】: テスト独立性確保のための全インスタンス初期化
   */
  static resetInstances(): void {
    HealthDIContainer.healthCheckUseCaseInstance = null;
    HealthDIContainer.healthCheckServiceInstance = null;
    HealthDIContainer.authProviderInstance = null;
    HealthDIContainer.loggerInstance = null;
  }

  // 【将来拡張予定】: 以下の機能を段階的に追加予定
  
  // static getMetricsService(): MetricsService
  // static getAlertService(): AlertService  
  // static getPerformanceMonitorUseCase(): PerformanceMonitorUseCase
  // static getLogAggregatorService(): LogAggregatorService
}