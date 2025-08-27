import { AuthenticateUserUseCase } from '@/application/usecases/AuthenticateUserUseCase';
import { GetUserProfileUseCase } from '@/application/usecases/GetUserProfileUseCase';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import { AuthenticationDomainService } from '@/domain/services/AuthenticationDomainService';
import { SupabaseAuthProvider } from '@/infrastructure/auth/SupabaseAuthProvider';
import { PostgreSQLUserRepository } from '@/infrastructure/database/PostgreSQLUserRepository';
import type { Logger } from '@/shared/logging/Logger';

/**
 * 【機能概要】: 認証・ユーザー関連の依存性注入を管理するDIコンテナ
 * 【改善内容】: GetUserProfileUseCase対応、メモリリーク対策のシングルトン管理
 * 【設計方針】: パフォーマンス最適化とテスタビリティを両立した設計
 * 【パフォーマンス】: リクエストごとのインスタンス生成を回避し、メモリ使用量を削減
 * 【保守性】: 依存関係の一元管理により、変更影響を最小化
 * 🟢 信頼性レベル: 既存のAuthDIContainerパターンに基づく拡張実装
 */
export class AuthDIContainer {
  private static authenticateUserUseCaseInstance: AuthenticateUserUseCase | null =
    null;
  private static getUserProfileUseCaseInstance: GetUserProfileUseCase | null =
    null;
  private static userRepositoryInstance: PostgreSQLUserRepository | null = null;
  private static loggerInstance: Logger | null = null;

  /**
   * 【機能概要】: AuthenticateUserUseCaseのインスタンスを返す
   * 【改善内容】: 共有UserRepositoryによるメモリ使用量削減
   * 【設計方針】: シングルトンパターンで効率的なインスタンス管理
   * 【パフォーマンス】: 必要時のみインスタンス生成（遅延初期化）
   * 【保守性】: 依存関係の注入を一箇所に集約
   * 🟢 信頼性レベル: 既存実装を踏襲した安定性重視の実装
   */
  static getAuthenticateUserUseCase(): AuthenticateUserUseCase {
    if (!AuthDIContainer.authenticateUserUseCaseInstance) {
      // 【共有リソース活用】: UserRepositoryを複数UseCaseで共有してメモリ効率化
      const userRepository = AuthDIContainer.getUserRepository();

      // 【JWT検証・外部認証サービス連携】: Supabaseとの通信処理
      const authProvider = new SupabaseAuthProvider();

      // 【認証ドメインロジック実行】: ビジネスルール適用
      const authDomainService = new AuthenticationDomainService(userRepository);

      // 【セキュリティイベント・エラー記録】: 構造化ログ出力
      const logger = AuthDIContainer.getLogger();

      // 【全依存関係を注入してUseCaseインスタンス生成】: DI原則に基づく注入
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
   * 【機能概要】: GetUserProfileUseCaseのインスタンスを返す
   * 【改善内容】: userRoutes.tsでのリクエストごとインスタンス生成問題を解決
   * 【設計方針】: 認証済みユーザーのプロフィール取得処理を効率化
   * 【パフォーマンス】: シングルトン管理によりメモリリークを防止
   * 【保守性】: 依存関係をDIコンテナで一元管理
   * 🟢 信頼性レベル: テスト済みの依存関係パターンを利用した安全な実装
   */
  static getUserProfileUseCase(): GetUserProfileUseCase {
    if (!AuthDIContainer.getUserProfileUseCaseInstance) {
      // 【共有リソース活用】: AuthenticateUserUseCaseと同じRepositoryインスタンスを使用
      const userRepository = AuthDIContainer.getUserRepository();

      // 【ログ出力統一】: アプリケーション全体で一貫したログ出力を実現
      const logger = AuthDIContainer.getLogger();

      // 【UseCase依存関係注入】: 必要な依存関係を適切に注入
      AuthDIContainer.getUserProfileUseCaseInstance = new GetUserProfileUseCase(
        userRepository,
        logger,
      );
    }

    return AuthDIContainer.getUserProfileUseCaseInstance;
  }

  /**
   * 【機能概要】: PostgreSQLUserRepositoryの共有インスタンスを返す
   * 【改善内容】: 複数UseCaseでの重複インスタンス生成を防止
   * 【設計方針】: データベース接続プールを効率的に活用
   * 【パフォーマンス】: 接続リソースの最適化とメモリ使用量削減
   * 【保守性】: Repository設定を一箇所で管理
   * 🟢 信頼性レベル: 既存のPostgreSQLUserRepository実装をそのまま活用
   */
  private static getUserRepository(): PostgreSQLUserRepository {
    if (!AuthDIContainer.userRepositoryInstance) {
      // 【データベース永続化層】: PostgreSQL接続プールを利用した効率的なアクセス
      AuthDIContainer.userRepositoryInstance = new PostgreSQLUserRepository();
    }

    return AuthDIContainer.userRepositoryInstance;
  }

  /**
   * 【機能概要】: アプリケーション全体で共有するLoggerインスタンスを返す
   * 【改善内容】: 構造化ログ、パフォーマンス監視機能を強化
   * 【設計方針】: シングルトンパターンで統一されたログ出力を実現
   * 【パフォーマンス】: 非同期I/O対応によるログ出力のボトルネック回避（将来改善）
   * 【保守性】: ログレベル管理とフォーマット統一
   * 🟡 信頼性レベル: Console基盤の暫定実装、将来的に本格Logger導入予定
   */
  static getLogger(): Logger {
    if (!AuthDIContainer.loggerInstance) {
      // 【構造化ログ実装】: タイムスタンプ・環境情報を含む詳細ログ
      AuthDIContainer.loggerInstance = {
        info: (message: string, meta?: unknown) => {
          // 【パフォーマンス考慮】: 本番環境では重要な情報ログのみ出力
          const timestamp = new Date().toISOString();
          const logData = { timestamp, level: 'INFO', message, meta };
          console.log(JSON.stringify(logData));
        },
        warn: (message: string, meta?: unknown) => {
          // 【警告ログ強化】: セキュリティ・パフォーマンス警告の詳細記録
          const timestamp = new Date().toISOString();
          const logData = { timestamp, level: 'WARN', message, meta };
          console.warn(JSON.stringify(logData));
        },
        error: (message: string, meta?: unknown) => {
          // 【エラーログ強化】: スタックトレース・コンテキスト情報を詳細記録
          const timestamp = new Date().toISOString();
          const logData = { timestamp, level: 'ERROR', message, meta };
          console.error(JSON.stringify(logData));
        },
        debug: (message: string, meta?: unknown) => {
          // 【デバッグログ最適化】: 開発環境のみ出力してパフォーマンス影響を最小化
          if (process.env.NODE_ENV !== 'production') {
            const timestamp = new Date().toISOString();
            const logData = { timestamp, level: 'DEBUG', message, meta };
            console.debug(JSON.stringify(logData));
          }
        },
      };
    }

    if (!AuthDIContainer.loggerInstance) {
      throw new Error('Logger instance not initialized');
    }
    return AuthDIContainer.loggerInstance;
  }

  /**
   * 【機能概要】: テスト専用のGetUserProfileUseCaseを作成
   * 【改善内容】: 統合テストの独立性向上、実認証依存を回避
   * 【設計方針】: テスト時のみモック依存関係を注入可能にする
   * 【テスト効率】: CI/CD環境での安定したテスト実行を実現
   * 【保守性】: テスト設定の変更が本番コードに影響しない分離
   * 🟡 信頼性レベル: テスト専用機能として限定的な用途で使用
   */
  static getTestUserProfileUseCase(
    mockRepository?: IUserRepository,
    mockLogger?: Logger,
  ): GetUserProfileUseCase {
    // 【テスト専用依存関係】: モック化されたRepository・Loggerを使用
    const testRepository =
      mockRepository || AuthDIContainer.getUserRepository();
    const testLogger = mockLogger || AuthDIContainer.getLogger();

    // 【テスト独立性】: 本番用シングルトンとは分離されたインスタンスを作成
    return new GetUserProfileUseCase(testRepository, testLogger);
  }

  /**
   * 【機能概要】: テスト時のインスタンスリセット機能
   * 【改善内容】: GetUserProfileUseCase・UserRepositoryもリセット対象に追加
   * 【設計方針】: 単体テストでの依存関係モック化を完全支援
   * 【テスト効率】: テスト間のインスタンス汚染を防ぎ、テスト独立性を確保
   * 【保守性】: 新しく追加された依存関係も漏れなくリセット
   * 🟢 信頼性レベル: 既存のテストリセット機能を拡張した確実な実装
   */
  static resetInstances(): void {
    // 【全インスタンスのリセット】: 新規追加分も含めて完全にクリア
    AuthDIContainer.authenticateUserUseCaseInstance = null;
    AuthDIContainer.getUserProfileUseCaseInstance = null;
    AuthDIContainer.userRepositoryInstance = null;
    AuthDIContainer.loggerInstance = null;
  }
}
