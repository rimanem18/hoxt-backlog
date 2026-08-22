import { createConsoleLogger } from '@/shared/logging/ConsoleLogger';
import type { Logger } from '@/shared/logging/Logger';
import { AuthenticateUserUseCase } from '@/user/application/AuthenticateUserUseCase';
import { EmailSignupUseCase } from '@/user/application/EmailSignupUseCase';
import { GetUserProfileUseCase } from '@/user/application/GetUserProfileUseCase';
import type { IUserRepository } from '@/user/domain';
import { AuthenticationDomainService } from '@/user/domain/services/AuthenticationDomainService';
import type { IAuthProvider } from '@/user/domain/services/IAuthProvider';
import { PostgreSQLUserRepository } from '@/user/infrastructure/PostgreSQLUserRepository';
import { SupabaseEmailSignupGateway } from '@/user/infrastructure/SupabaseEmailSignupGateway';
import { SupabaseJwtVerifier } from '@/user/infrastructure/SupabaseJwtVerifier';
import { TestBypassAuthProvider } from '@/user/infrastructure/TestBypassAuthProvider';

/**
 * 認証・ユーザー関連の依存性注入コンテナ
 *
 * 各 UseCase・Repository・Logger を遅延初期化のシングルトンで管理する。
 * リクエストごとのインスタンス生成を避けて接続リソースを効率化する。
 */
export class AuthDIContainer {
  private static authenticateUserUseCaseInstance: AuthenticateUserUseCase | null =
    null;
  private static emailSignupUseCaseInstance: EmailSignupUseCase | null = null;
  private static getUserProfileUseCaseInstance: GetUserProfileUseCase | null =
    null;
  private static userRepositoryInstance: PostgreSQLUserRepository | null = null;
  private static authProviderInstance: IAuthProvider | null = null;
  private static loggerInstance: Logger | null = null;

  /**
   * AuthenticateUserUseCase のシングルトンインスタンスを返す
   *
   * テスト環境では使用不可（getAuthProvider() が例外を投げる）。
   */
  static getAuthenticateUserUseCase(): AuthenticateUserUseCase {
    if (!AuthDIContainer.authenticateUserUseCaseInstance) {
      const userRepository = AuthDIContainer.getUserRepository();
      const authProvider = AuthDIContainer.getAuthProvider();
      const authDomainService = new AuthenticationDomainService(userRepository);
      const logger = AuthDIContainer.getLogger();

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
   * EmailSignupUseCase のシングルトンインスタンスを返す
   *
   * SupabaseEmailSignupGateway（publishable key）と UserRepository を DI する。
   */
  static getEmailSignupUseCase(): EmailSignupUseCase {
    if (!AuthDIContainer.emailSignupUseCaseInstance) {
      AuthDIContainer.emailSignupUseCaseInstance = new EmailSignupUseCase(
        AuthDIContainer.getUserRepository(),
        SupabaseEmailSignupGateway.getInstance(),
      );
    }

    return AuthDIContainer.emailSignupUseCaseInstance;
  }

  /** GetUserProfileUseCase のシングルトンインスタンスを返す */
  static getUserProfileUseCase(): GetUserProfileUseCase {
    if (!AuthDIContainer.getUserProfileUseCaseInstance) {
      const userRepository = AuthDIContainer.getUserRepository();
      const logger = AuthDIContainer.getLogger();

      AuthDIContainer.getUserProfileUseCaseInstance = new GetUserProfileUseCase(
        userRepository,
        logger,
      );
    }

    return AuthDIContainer.getUserProfileUseCaseInstance;
  }

  /**
   * PostgreSQLUserRepository の共有インスタンスを返す
   *
   * public: authMiddleware から直接 DB 検索に使用するため公開。
   */
  public static getUserRepository(): PostgreSQLUserRepository {
    if (!AuthDIContainer.userRepositoryInstance) {
      AuthDIContainer.userRepositoryInstance = new PostgreSQLUserRepository();
    }

    return AuthDIContainer.userRepositoryInstance;
  }

  /**
   * AuthProvider の共有インスタンスを返す
   *
   * テスト環境では setAuthProviderForTesting() で明示的に注入すること。
   * CI 環境でも E2E/smoke test が実際の認証を使う場合があるため NODE_ENV=test のみで判定する。
   */
  public static getAuthProvider(): IAuthProvider {
    if (AuthDIContainer.authProviderInstance) {
      return AuthDIContainer.authProviderInstance;
    }

    if (process.env.NODE_ENV === 'test') {
      throw new Error(
        'AuthDIContainer.getAuthProvider() cannot be used in test environment. ' +
          'Please use AuthDIContainer.setAuthProviderForTesting() to inject a mock IAuthProvider.',
      );
    }

    AuthDIContainer.authProviderInstance = new TestBypassAuthProvider(
      new SupabaseJwtVerifier(),
    );

    return AuthDIContainer.authProviderInstance;
  }

  /**
   * テスト用: 全シングルトンをリセットする
   *
   * 次のリクエスト時に依存関係が再生成される。
   */
  public static resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTesting is only available in test environment');
    }

    AuthDIContainer.authenticateUserUseCaseInstance = null;
    AuthDIContainer.emailSignupUseCaseInstance = null;
    AuthDIContainer.getUserProfileUseCaseInstance = null;
    AuthDIContainer.userRepositoryInstance = null;
    AuthDIContainer.authProviderInstance = null;
    AuthDIContainer.loggerInstance = null;
  }

  /**
   * テスト用: AuthProvider を差し替える
   *
   * 呼び出し後は resetForTesting() でキャッシュ済み UseCase を破棄することを推奨。
   */
  public static setAuthProviderForTesting(provider: IAuthProvider): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'setAuthProviderForTesting is only available in test environment',
      );
    }

    AuthDIContainer.authProviderInstance = provider;

    if (
      AuthDIContainer.authenticateUserUseCaseInstance ||
      AuthDIContainer.getUserProfileUseCaseInstance
    ) {
      console.warn(
        '[AuthDIContainer] setAuthProviderForTesting: Cached UseCases detected. ' +
          'Consider calling resetForTesting() first to avoid stale dependencies.',
      );
    }
  }

  /** 構造化ログを出力する Logger のシングルトンインスタンスを返す */
  static getLogger(): Logger {
    if (!AuthDIContainer.loggerInstance) {
      AuthDIContainer.loggerInstance = createConsoleLogger();
    }

    return AuthDIContainer.loggerInstance;
  }

  /**
   * テスト用: モック依存関係で GetUserProfileUseCase を生成する
   *
   * 本番用シングルトンとは独立したインスタンスを返す。
   */
  static getTestUserProfileUseCase(
    mockRepository?: IUserRepository,
    mockLogger?: Logger,
  ): GetUserProfileUseCase {
    const testRepository =
      mockRepository || AuthDIContainer.getUserRepository();
    const testLogger = mockLogger || AuthDIContainer.getLogger();

    return new GetUserProfileUseCase(testRepository, testLogger);
  }
}
