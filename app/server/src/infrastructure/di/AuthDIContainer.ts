import { AuthenticateUserUseCase } from '@/application/usecases/AuthenticateUserUseCase';
import { AuthenticationDomainService } from '@/domain/services/AuthenticationDomainService';
import { SupabaseAuthProvider } from '@/infrastructure/auth/SupabaseAuthProvider';
import { PostgreSQLUserRepository } from '@/infrastructure/database/PostgreSQLUserRepository';
import type { Logger } from '@/shared/logging/Logger';

/**
 * 認証関連の依存性注入を管理するDIコンテナ
 *
 * シングルトンパターンによる効率的なインスタンス管理を実現。
 * AuthenticateUserUseCaseと関連する依存関係の中央管理を提供する。
 */
export class AuthDIContainer {
  private static authenticateUserUseCaseInstance: AuthenticateUserUseCase | null =
    null;
  private static loggerInstance: Logger | null = null;

  /**
   * AuthenticateUserUseCaseのインスタンスを返す
   *
   * シングルトンパターンでインスタンスを管理し、
   * 必要な依存関係を適切に注入する。
   */
  static getAuthenticateUserUseCase(): AuthenticateUserUseCase {
    if (!AuthDIContainer.authenticateUserUseCaseInstance) {
      // データベース永続化層
      const userRepository = new PostgreSQLUserRepository();

      // JWT検証・外部認証サービス連携
      const authProvider = new SupabaseAuthProvider();

      // 認証ドメインロジック実行
      const authDomainService = new AuthenticationDomainService(userRepository);

      // セキュリティイベント・エラー記録
      const logger = AuthDIContainer.getLogger();

      // 全依存関係を注入してUseCaseインスタンス生成
      AuthDIContainer.authenticateUserUseCaseInstance =
        new AuthenticateUserUseCase(
          userRepository,
          authProvider,
          authDomainService,
          logger,
        );
    }

    return AuthDIContainer.authenticateUserUseCaseInstance;
  }

  /**
   * アプリケーション全体で共有するLoggerインスタンスを返す
   *
   * シングルトンパターンでインスタンスを管理し、
   * セキュリティイベント記録機能を提供する。
   */
  private static getLogger(): Logger {
    if (!AuthDIContainer.loggerInstance) {
      // Console基盤の簡易Logger実装
      AuthDIContainer.loggerInstance = {
        info: (message: string, meta?: unknown) =>
          console.log(`[INFO] ${message}`, meta),
        warn: (message: string, meta?: unknown) =>
          console.warn(`[WARN] ${message}`, meta),
        error: (message: string, meta?: unknown) =>
          console.error(`[ERROR] ${message}`, meta),
        debug: (message: string, meta?: unknown) =>
          console.debug(`[DEBUG] ${message}`, meta),
      };
    }

    if (!AuthDIContainer.loggerInstance) {
      throw new Error('Logger instance not initialized');
    }
    return AuthDIContainer.loggerInstance;
  }

  /**
   * テスト時のインスタンスリセット機能
   *
   * 単体テストでの依存関係モック化を支援する。
   */
  static resetInstances(): void {
    AuthDIContainer.authenticateUserUseCaseInstance = null;
    AuthDIContainer.loggerInstance = null;
  }
}
