/**
 * ユーザー認証UseCase実装
 *
 * JWT検証からユーザー認証・JITプロビジョニングまでの
 * 一連のビジネスフローを管理するApplication層のUseCase実装。
 */

import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { IAuthenticationDomainService } from '@/domain/services/IAuthenticationDomainService';
import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { TokenExpiredError } from '@/domain/user/errors/TokenExpiredError';
import { ExternalServiceError } from '@/shared/errors/ExternalServiceError';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { ValidationError } from '@/shared/errors/ValidationError';
import type { Logger } from '@/shared/logging/Logger';
import type { IErrorClassificationService } from '@/shared/services/ErrorClassificationService';
import { ErrorClassificationService } from '@/shared/services/ErrorClassificationService';
import type { IJwtValidationService } from '@/shared/services/JwtValidationService';
import { JwtValidationService } from '@/shared/services/JwtValidationService';
import {
  createDependencyNullError,
  getErrorMessage,
} from '@/shared/utils/errorUtils';
import type {
  AuthenticateUserUseCaseInput,
  AuthenticateUserUseCaseOutput,
  IAuthenticateUserUseCase,
} from '../interfaces/IAuthenticateUserUseCase';

/**
 * 認証処理の設定値
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
 * JWT検証、ユーザー認証、JITプロビジョニングを実行し、
 * 認証フロー全体を管理するApplication層のUseCase。
 *
 * @example
 * ```typescript
 * const useCase = new AuthenticateUserUseCase(
 *   userRepository,
 *   authProvider,
 *   authDomainService,
 *   logger
 * );
 * const result = await useCase.execute({ jwt: 'eyJ...' });
 * if (result.isNewUser) {
 *   console.log('New user created:', result.user.id);
 * }
 * ```
 */
export class AuthenticateUserUseCase implements IAuthenticateUserUseCase {
  private readonly config: AuthenticationConfig;
  private readonly jwtValidationService: IJwtValidationService;
  private readonly errorClassificationService: IErrorClassificationService;

  /**
   * AuthenticateUserUseCaseのコンストラクタ
   *
   * @param userRepository ユーザー情報の永続化を担当するリポジトリ
   * @param authProvider JWT検証と外部ユーザー情報抽出を提供するプロバイダー
   * @param authDomainService 認証に関するドメインロジックを実行するサービス
   * @param logger ログ出力を担当するロガー
   * @param config 認証処理の設定値（オプション）
   * @param jwtValidationService JWT構造検証サービス（オプション）
   * @param errorClassificationService エラー分類サービス（オプション）
   */
  constructor(
    readonly userRepository: IUserRepository,
    private readonly authProvider: IAuthProvider,
    private readonly authDomainService: IAuthenticationDomainService,
    private readonly logger: Logger,
    config?: Partial<AuthenticationConfig>,
    jwtValidationService?: IJwtValidationService,
    errorClassificationService?: IErrorClassificationService,
  ) {
    // デフォルト設定とカスタム設定をマージ
    this.config = { ...DEFAULT_CONFIG, ...config };

    // JWT検証サービスの初期化（依存性注入またはデフォルト実装）
    this.jwtValidationService =
      jwtValidationService ||
      new JwtValidationService({
        maxLength: this.config.JWT_MAX_LENGTH,
      });

    // エラー分類サービスの初期化（依存性注入またはデフォルト実装）
    this.errorClassificationService =
      errorClassificationService || new ErrorClassificationService();

    // 必須依存関係のnullチェック
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
   * @param input JWTトークンを含む入力パラメータ
   * @returns 認証済みユーザー情報と新規作成フラグ
   * @throws ValidationError 入力検証失敗時
   * @throws AuthenticationError JWT検証失敗時
   * @throws InfrastructureError データベース接続失敗時
   * @throws ExternalServiceError 外部サービス障害時
   */
  async execute(
    input: AuthenticateUserUseCaseInput,
  ): Promise<AuthenticateUserUseCaseOutput> {
    const startTime = Date.now(); // パフォーマンス測定開始

    try {
      // 入力パラメータの事前検証
      if (!input || !input.jwt) {
        this.logger.warn('Authentication failed: Missing input or JWT', {
          input: '[REDACTED]',
        });
        throw new ValidationError('JWTトークンが必要です');
      }

      // JWT構造の事前検証
      const jwtValidationResult = this.jwtValidationService.validateStructure(
        input.jwt,
      );

      if (!jwtValidationResult.isValid) {
        this.logger.warn('JWT validation failed', {
          reason: jwtValidationResult.failureReason,
          jwtLength: input.jwt.length,
          errorMessage: jwtValidationResult.errorMessage,
        });

        // 【エラー分類実装】: JWT形式エラーの場合はAuthenticationError.invalidFormat()を使用
        // 【実装方針】: テストで期待される具体的なエラーコードとメッセージを提供
        // 🟢 信頼性レベル: テスト要件から直接抽出された確立された手法
        throw AuthenticationError.invalidFormat();
      }

      this.logger.info('Starting user authentication', {
        jwtLength: input.jwt.length,
      });

      // 【パフォーマンス最適化】: 無駄な並列処理を除去し、直接実行に変更
      // 【改善内容】: Promise.allの無意味な利用を削除、実行効率を向上
      // 【設計方針】: 将来の拡張は必要な時点で適切な並列処理として実装
      // 🟢 信頼性レベル: パフォーマンスレビューに基づく実証された改善
      const verificationResult = await this.authProvider.verifyToken(input.jwt);

      if (!verificationResult.valid || !verificationResult.payload) {
        this.logger.warn('User authentication failed', {
          reason: 'Invalid JWT',
          errorMessage: verificationResult.error,
        });

        // 【セキュリティ強化】: エラーメッセージ統一化による情報漏洩防止
        // 【改善内容】: JWT検証エラーの詳細分類を廃止し、統一エラーで攻撃者情報収集を阻止
        // 【設計方針】: 期限切れ・署名不正の区別を不可能にし、セキュリティ脆弱性を根本的に解決
        // 🟢 信頼性レベル: セキュリティレビューに基づく実証された強化策
        
        // 全てのJWT検証失敗を統一エラーとして処理（セキュリティベストプラクティス）
        throw AuthenticationError.invalidToken();
      }

      // JWTペイロードから外部ユーザー情報を抽出
      const externalUserInfo = await this.authProvider.getExternalUserInfo(
        verificationResult.payload,
      );

      // ユーザー認証またはJITプロビジョニングを実行
      const authResult =
        await this.authDomainService.authenticateUser(externalUserInfo);

      // パフォーマンス測定とログ出力
      const executionTime = Date.now() - startTime;
      const timeLimit = authResult.isNewUser
        ? this.config.NEW_USER_TIME_LIMIT_MS
        : this.config.EXISTING_USER_TIME_LIMIT_MS;

      if (executionTime > timeLimit) {
        this.logger.warn('Performance requirement not met', {
          executionTime,
          timeLimit,
          isNewUser: authResult.isNewUser,
        });
      }

      this.logger.info('User authentication successful', {
        userId: authResult.user.id,
        externalId: authResult.user.externalId,
        isNewUser: authResult.isNewUser,
        executionTime,
        provider: authResult.user.provider,
      });

      return {
        user: authResult.user,
        isNewUser: authResult.isNewUser,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // 既知のビジネス例外の場合はそのまま再スロー
      if (
        error instanceof ValidationError ||
        error instanceof AuthenticationError ||
        error instanceof TokenExpiredError ||
        error instanceof InfrastructureError ||
        error instanceof ExternalServiceError
      ) {
        throw error;
      }

      // 未知のエラーはログ出力後に適切なビジネス例外に変換
      this.logger.error('User authentication error', {
        error: getErrorMessage(error),
        executionTime,
        jwt: '[REDACTED]',
      });

      const classificationResult =
        this.errorClassificationService.classifyError(
          error,
          'user-authentication',
        );

      this.logger.warn('Error classified for user authentication', {
        originalErrorName: classificationResult.originalError.name,
        originalErrorMessage: classificationResult.originalError.message,
        classificationReason: classificationResult.classificationReason,
        businessErrorType: classificationResult.businessError.constructor.name,
        executionTime,
      });

      throw classificationResult.businessError;
    }
  }
}
