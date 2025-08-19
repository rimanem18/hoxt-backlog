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
 * 🟢 アーキテクチャ設計文書から明確に定義済み
 */
export class AuthenticateUserUseCase implements IAuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authProvider: IAuthProvider,
    private readonly authDomainService: IAuthenticationDomainService,
    private readonly logger: Logger
  ) {
    // 【依存性注入の検証】: 必須依存関係のnullチェック
    // 【初期化時の品質保証】: 依存関係が正しく注入されていることを確認
    if (!userRepository) {
      throw new Error('Required dependency userRepository is null');
    }
    if (!authProvider) {
      throw new Error('Required dependency authProvider is null');
    }
    if (!authDomainService) {
      throw new Error('Required dependency authDomainService is null');
    }
    if (!logger) {
      throw new Error('Required dependency logger is null');
    }
  }

  /**
   * ユーザー認証実行
   * 
   * 【処理フロー】
   * 1. 入力値検証（JWT形式・空文字チェック）
   * 2. JWT検証（SupabaseAuthProvider.verifyToken）
   * 3. 外部ユーザー情報抽出（SupabaseAuthProvider.getExternalUserInfo）
   * 4. ユーザー認証またはJIT作成（AuthenticationDomainService.authenticateUser）
   * 5. 認証結果返却
   * 
   * @param input JWTトークンを含む入力パラメータ
   * @returns 認証済みユーザー情報と新規作成フラグ
   * 
   * 🟢 dataflow.md認証フローシーケンスから明確に定義済み
   */
  async execute(input: AuthenticateUserUseCaseInput): Promise<AuthenticateUserUseCaseOutput> {
    const startTime = Date.now(); // パフォーマンス測定開始
    
    try {
      // 【入力値検証】: JWT形式・空文字・null・undefinedのチェック
      // 🟢 入力検証制約から明確に定義済み
      if (!input.jwt || input.jwt.trim() === '') {
        this.logger.warn('Authentication failed: Empty JWT token', { input: '[REDACTED]' });
        throw new ValidationError('JWTトークンが必要です');
      }

      // 【JWT長制限チェック】: 2KB程度の長大JWT処理確認
      // 🟡 JWT仕様から妥当な推測
      if (input.jwt.length > 2048) {
        this.logger.warn('Authentication failed: JWT too long', { jwtLength: input.jwt.length });
        throw new ValidationError('JWTサイズが上限を超えています');
      }

      this.logger.info('Starting user authentication', { jwtLength: input.jwt.length });

      // 【JWT検証】: SupabaseAuthProviderによる厳密な署名・有効期限検証
      // 🟢 セキュリティ要件から明確に定義済み
      const verificationResult = await this.authProvider.verifyToken(input.jwt);
      
      if (!verificationResult.valid || !verificationResult.payload) {
        this.logger.warn('User authentication failed', { 
          reason: 'Invalid JWT', 
          error: verificationResult.error 
        });
        throw new AuthenticationError('認証トークンが無効です');
      }

      // 【外部ユーザー情報抽出】: JWTペイロードから正規化されたユーザー情報を取得
      // 🟢 IAuthProvider仕様から明確に定義済み
      const externalUserInfo = await this.authProvider.getExternalUserInfo(verificationResult.payload);

      // 【ユーザー認証またはJIT作成】: AuthenticationDomainServiceによる一連の認証フロー実行
      // 🟢 IAuthenticationDomainService仕様から明確に定義済み
      const authResult = await this.authDomainService.authenticateUser(externalUserInfo);

      // 【パフォーマンス測定】: 要件で定められたレスポンス時間の確認
      // 🟢 NFR-002（1秒）・NFR-003（2秒）から明確に定義済み
      const executionTime = Date.now() - startTime;
      const timeLimit = authResult.isNewUser ? 2000 : 1000; // JIT作成は2秒、既存ユーザーは1秒
      
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
      // 🟢 監査・デバッグ要件から明確に定義済み
      this.logger.error('User authentication error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        jwt: '[REDACTED]' // セキュリティ上の理由でJWTは記録しない
      });

      // 【エラー種別判定】: エラーメッセージや型から適切な例外に変換
      // 🟢 エラーハンドリング仕様から明確に定義済み
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // データベース関連エラーの判定
        if (errorMessage.includes('database') || 
            errorMessage.includes('connection') || 
            errorMessage.includes('timeout')) {
          throw new InfrastructureError('ユーザー情報の取得に失敗しました');
        }
        
        // 外部サービス（Supabase）関連エラーの判定
        if (errorMessage.includes('supabase') || 
            errorMessage.includes('external') || 
            errorMessage.includes('service') ||
            errorMessage.includes('network')) {
          throw new ExternalServiceError('認証サービスが一時的に利用できません');
        }
      }

      // その他の未知のエラーはAuthenticationErrorとして処理
      throw new AuthenticationError('認証処理中にエラーが発生しました');
    }
  }
}