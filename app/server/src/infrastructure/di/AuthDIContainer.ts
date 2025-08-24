import { AuthenticateUserUseCase } from '@/application/usecases/AuthenticateUserUseCase';
import { PostgreSQLUserRepository } from '@/infrastructure/database/PostgreSQLUserRepository';
import { SupabaseAuthProvider } from '@/infrastructure/auth/SupabaseAuthProvider';
import { AuthenticationDomainService } from '@/domain/services/AuthenticationDomainService';
import type { Logger } from '@/shared/logging/Logger';

/**
 * 【機能概要】: 認証関連の依存性注入を管理するDIコンテナ
 * 【改善内容】: Green フェーズのnull依存関係を実際の実装に置換
 * 【設計方針】: シングルトンパターンによる効率的なインスタンス管理
 * 【パフォーマンス】: インスタンス再利用によるオーバーヘッド削減
 * 【保守性】: 依存関係の中央集約により保守性向上
 * 🟢 信頼性レベル: 既存の実装済み依存関係を活用した確実な実装
 */
export class AuthDIContainer {
  private static authenticateUserUseCaseInstance: AuthenticateUserUseCase | null = null;
  private static loggerInstance: Logger | null = null;
  
  /**
   * 【機能概要】: AuthenticateUserUseCaseの適切に設定されたインスタンスを返す
   * 【改善内容】: null依存関係から実際の依存関係への完全置換
   * 【シングルトン実装】: パフォーマンス最適化のためのインスタンス再利用
   * 🟢 信頼性レベル: 既存実装の組み合わせによる確実な構成
   */
  static getAuthenticateUserUseCase(): AuthenticateUserUseCase {
    if (!this.authenticateUserUseCaseInstance) {
      // 【依存関係構築】: 実際の実装クラスによる確実な依存関係注入
      // 🟢 PostgreSQLUserRepository: データベース永続化層
      const userRepository = new PostgreSQLUserRepository();
      
      // 🟢 SupabaseAuthProvider: JWT検証・外部認証サービス連携
      const authProvider = new SupabaseAuthProvider();
      
      // 🟢 AuthenticationDomainService: 認証ドメインロジック実行
      const authDomainService = new AuthenticationDomainService(userRepository);
      
      // 🟢 Logger: セキュリティイベント・エラー記録
      const logger = this.getLogger();
      
      // 【UseCaseインスタンス生成】: 全依存関係を適切に注入
      // 🟢 実装済みクラスの組み合わせによる確実な動作保証
      this.authenticateUserUseCaseInstance = new AuthenticateUserUseCase(
        userRepository,
        authProvider,  
        authDomainService,
        logger
      );
    }
    
    return this.authenticateUserUseCaseInstance;
  }
  
  /**
   * 【機能概要】: アプリケーション全体で共有するLoggerインスタンスを返す
   * 【セキュリティ強化】: 認証関連のセキュリティイベント記録機能提供
   * 【パフォーマンス】: シングルトンによる効率的なログ処理
   * 🟡 信頼性レベル: ConsoleLoggerの存在は推測（一般的な実装パターン）
   */
  private static getLogger(): Logger {
    if (!this.loggerInstance) {
      // 【フォールバック実装】: ConsoleLoggerが見つからない場合の簡易Logger
      // 🔴 一時的な実装（実際のLoggerが実装されるまでの対応）
      this.loggerInstance = {
        info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta),
        warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta),
        error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta),
        debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta),
      };
    }
    
    return this.loggerInstance!;
  }
  
  /**
   * 【テスト支援機能】: テスト時のインスタンスリセット機能
   * 【保守性】: 単体テストでの依存関係モック化支援
   * 🟡 信頼性レベル: テスト支援のベストプラクティス
   */
  static resetInstances(): void {
    this.authenticateUserUseCaseInstance = null;
    this.loggerInstance = null;
  }
}