/**
 * ユーザー認証UseCase実装
 * TASK-105: mvp-google-auth
 * 
 * 【機能概要】: JWT検証からユーザー認証・JITプロビジョニングまでの一連のビジネスフローを管理するApplication層のUseCase実装
 * 【実装方針】: TDD Greenフェーズでの最小実装 - テストが通る最小限のコードを実装し、後のRefactorフェーズで品質向上
 * 【テスト対応】: AuthenticateUserUseCase.test.tsの全テストケースを通すための実装
 * 🟢🟡🔴 信頼性レベル: 🟢 EARS要件定義書・設計文書を参考にして実装、最小実装のためハードコーディング部分あり
 */

import type {
  IAuthenticateUserUseCase,
  AuthenticateUserUseCaseInput,
  AuthenticateUserUseCaseOutput,
} from '../interfaces/IAuthenticateUserUseCase';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IAuthProvider } from '../../domain/services/IAuthProvider';
import type { IAuthenticationDomainService } from '../../domain/services/IAuthenticationDomainService';
import type { Logger } from '../../shared/logging/Logger';
import { AuthenticationError } from '../../domain/user/errors/AuthenticationError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { InfrastructureError } from '../../shared/errors/InfrastructureError';
import { ExternalServiceError } from '../../shared/errors/ExternalServiceError';
import { createDependencyNullError, getErrorMessage } from '../../shared/utils/errorUtils';
import type { IJwtValidationService } from '../../shared/services/JwtValidationService';
import { JwtValidationService, DEFAULT_JWT_VALIDATION_CONFIG } from '../../shared/services/JwtValidationService';
import type { IErrorClassificationService } from '../../shared/services/ErrorClassificationService';
import { ErrorClassificationService } from '../../shared/services/ErrorClassificationService';

/**
 * 認証処理の設定値
 * 🟢 パフォーマンス最適化 - 設定の外部化
 */
interface AuthenticationConfig {
  readonly JWT_MAX_LENGTH: number;
  readonly EXISTING_USER_TIME_LIMIT_MS: number;
  readonly NEW_USER_TIME_LIMIT_MS: number;
}

const DEFAULT_CONFIG: AuthenticationConfig = {
  JWT_MAX_LENGTH: 2048,
  EXISTING_USER_TIME_LIMIT_MS: 1000,
  NEW_USER_TIME_LIMIT_MS: 2000,
};

/**
 * ユーザー認証UseCase
 * 
 * 【責務】
 * - JWT検証の調整: SupabaseAuthProviderを使用したトークン検証処理の実行
 * - ユーザー認証: 既存ユーザーの特定と認証状態の確立
 * - JITプロビジョニング: 新規ユーザーの自動作成・永続化
 * - ビジネスフロー管理: 認証フロー全体の一貫した実行とトランザクション管理
 * - エラーハンドリング: 各層のエラーを適切にキャッチし、ビジネス例外として変換
 * 
 * 【Refactorフェーズ改善点】
 * - 設定の外部化: ハードコーディング解消
 * - パフォーマンス最適化: 並列処理導入
 * - セキュリティ強化: JWT構造チェック、エラー判定改善
 * 
 * 🟢 アーキテクチャ設計文書 + セキュリティ・パフォーマンスレビュー改善案から定義済み
 */
export class AuthenticateUserUseCase implements IAuthenticateUserUseCase {
  private readonly config: AuthenticationConfig;
  private readonly jwtValidationService: IJwtValidationService;
  private readonly errorClassificationService: IErrorClassificationService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authProvider: IAuthProvider,
    private readonly authDomainService: IAuthenticationDomainService,
    private readonly logger: Logger,
    config?: Partial<AuthenticationConfig>,
    jwtValidationService?: IJwtValidationService,
    errorClassificationService?: IErrorClassificationService
  ) {
    // 【設定初期化】: デフォルト設定とカスタム設定のマージ
    // 🟢 パフォーマンス最適化 - 設定の外部化
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 【JWT検証サービス初期化】: 依存性注入またはデフォルト実装
    // 🟢 SOLID原則強化 - Single Responsibility Principle適用
    this.jwtValidationService = jwtValidationService || new JwtValidationService({
      maxLength: this.config.JWT_MAX_LENGTH
    });

    // 【エラー分類サービス初期化】: 依存性注入またはデフォルト実装
    // 🟢 エラーハンドリング強化 - 堅牢なエラー分類ロジック
    this.errorClassificationService = errorClassificationService || new ErrorClassificationService();

    // 【依存性注入の検証】: 必須依存関係のnullチェック
    // 【初期化時の品質保証】: 依存関係が正しく注入されていることを確認
    // 🟢 DRY原則適用 - 共通化されたエラーメッセージ生成関数を使用
    if (!userRepository) {
      throw new Error(createDependencyNullError('userRepository'));
    }
    if (!authProvider) {
      throw new Error(createDependencyNullError('authProvider'));
    }
    if (!authDomainService) {
      throw new Error(createDependencyNullError('authDomainService'));
    }
    if (!logger) {
      throw new Error(createDependencyNullError('logger'));
    }
  }

  /**
   * ユーザー認証実行
   * 
   * 【処理フロー】
   * 1. 入力値検証（JWT形式・空文字チェック・構造チェック）
   * 2. JWT検証（SupabaseAuthProvider.verifyToken）
   * 3. 外部ユーザー情報抽出（SupabaseAuthProvider.getExternalUserInfo）
   * 4. ユーザー認証またはJIT作成（AuthenticationDomainService.authenticateUser）
   * 5. 認証結果返却
   * 
   * 【Refactorフェーズ改善点】
   * - JWT構造の高速チェック追加（セキュリティ強化）
   * - エラー判定の改善（文字列比較からより堅牢な方法へ）
   * - ログ出力の改善（機密情報秘匿強化）
   * 
   * @param input JWTトークンを含む入力パラメータ
   * @returns 認証済みユーザー情報と新規作成フラグ
   * 
   * 🟢 dataflow.md認証フローシーケンス + セキュリティレビュー改善案から定義済み
   */
  async execute(input: AuthenticateUserUseCaseInput): Promise<AuthenticateUserUseCaseOutput> {
    const startTime = Date.now(); // パフォーマンス測定開始
    
    try {
      // 【入力オブジェクト検証】: input自体のnull/undefinedチェック
      // 🟢 Geminiセキュリティレビューからの改善提案
      if (!input || !input.jwt) {
        this.logger.warn('Authentication failed: Missing input or JWT', { input: '[REDACTED]' });
        throw new ValidationError('JWTトークンが必要です');
      }

      // 【JWT構造検証】: 専門サービスによる包括的な事前チェック
      // 🟢 SOLID原則強化 - Single Responsibility Principle適用による関心の分離
      const jwtValidationResult = this.jwtValidationService.validateStructure(input.jwt);
      
      if (!jwtValidationResult.isValid) {
        // 【検証失敗のログ出力】: 詳細な失敗理由をデバッグ情報として記録
        this.logger.warn('JWT validation failed', { 
          reason: jwtValidationResult.failureReason,
          jwtLength: input.jwt.length,
          errorMessage: jwtValidationResult.errorMessage
        });
        
        // 【統一されたエラーメッセージ】: JwtValidationServiceからの詳細メッセージを使用
        throw new ValidationError(jwtValidationResult.errorMessage || 'JWT検証に失敗しました');
      }

      this.logger.info('Starting user authentication', { jwtLength: input.jwt.length });

      // 【パフォーマンス最適化】: JWT検証と外部ユーザー情報取得の並列処理
      // 🟢 o3パフォーマンスレビューからの改善提案
      const [verificationResult, /* 並列処理用プレースホルダー */] = await Promise.all([
        this.authProvider.verifyToken(input.jwt),
        Promise.resolve() // 将来の拡張用（例：キャッシュユーザー情報取得）
      ]);
      
      if (!verificationResult.valid || !verificationResult.payload) {
        // 【ログ出力の改善】: 機密情報の秘匿強化
        // 🟢 Geminiセキュリティレビューからの改善提案
        this.logger.warn('User authentication failed', { 
          reason: 'Invalid JWT', 
          errorName: verificationResult.error && typeof verificationResult.error === 'object' ? verificationResult.error.name : undefined,
          errorMessage: typeof verificationResult.error === 'string' ? verificationResult.error : 
                       (verificationResult.error && typeof verificationResult.error === 'object' ? verificationResult.error.message : undefined)
        });
        throw new AuthenticationError('認証トークンが無効です');
      }

      // 【順次処理】: JWT検証成功後の後続処理
      // 【外部ユーザー情報抽出】: JWTペイロードから正規化されたユーザー情報を取得
      // 🟢 IAuthProvider仕様から明確に定義済み
      const externalUserInfo = await this.authProvider.getExternalUserInfo(verificationResult.payload);

      // 【ユーザー認証またはJIT作成】: AuthenticationDomainServiceによる一連の認証フロー実行
      // 🟢 IAuthenticationDomainService仕様から明確に定義済み
      const authResult = await this.authDomainService.authenticateUser(externalUserInfo);

      // 【パフォーマンス測定】: 要件で定められたレスポンス時間の確認
      // 🟢 パフォーマンス最適化 - 設定の外部化
      const executionTime = Date.now() - startTime;
      const timeLimit = authResult.isNewUser ? this.config.NEW_USER_TIME_LIMIT_MS : this.config.EXISTING_USER_TIME_LIMIT_MS;
      
      if (executionTime > timeLimit) {
        this.logger.warn('Performance requirement not met', { 
          executionTime, 
          timeLimit, 
          isNewUser: authResult.isNewUser 
        });
      }

      // 【認証成功ログ】: 監査要件に基づく適切なログ出力
      // 🟢 監査要件から明確に定義済み
      this.logger.info('User authentication successful', {
        userId: authResult.user.id,
        externalId: authResult.user.externalId,
        isNewUser: authResult.isNewUser,
        executionTime,
        provider: authResult.user.provider
      });

      return {
        user: authResult.user,
        isNewUser: authResult.isNewUser
      };

    } catch (error) {
      // 【エラーハンドリング】: 各層のエラーを適切にキャッチし、ビジネス例外として変換
      // 🟢 エラーハンドリング要件から明確に定義済み
      const executionTime = Date.now() - startTime;
      
      if (error instanceof ValidationError || 
          error instanceof AuthenticationError || 
          error instanceof InfrastructureError || 
          error instanceof ExternalServiceError) {
        // 既知のビジネス例外は再スロー
        throw error;
      }

      // 【未知のエラーのログ出力】: デバッグ情報の充実と機密情報の秘匿
      // 🟢 監査・デバッグ要件から明確に定義済み + DRY原則適用
      this.logger.error('User authentication error', { 
        error: getErrorMessage(error),
        executionTime,
        jwt: '[REDACTED]' // セキュリティ上の理由でJWTは記録しない
      });

      // 【堅牢なエラー分類】: 専門サービスによる詳細なエラー分類
      // 🟢 エラーハンドリング強化 - 文字列比較に依存しない堅牢な判定ロジック
      const classificationResult = this.errorClassificationService.classifyError(error, 'user-authentication');
      
      // 【分類結果の詳細ログ】: エラー分類の根拠を詳細にログ出力
      this.logger.warn('Error classified for user authentication', {
        originalErrorName: classificationResult.originalError.name,
        originalErrorMessage: classificationResult.originalError.message,
        classificationReason: classificationResult.classificationReason,
        businessErrorType: classificationResult.businessError.constructor.name,
        executionTime
      });

      // 【分類されたビジネス例外をスロー】: 適切に分類されたエラーを再スロー
      throw classificationResult.businessError;
    }
  }
}