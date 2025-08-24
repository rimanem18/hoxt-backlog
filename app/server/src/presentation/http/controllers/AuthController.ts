/**
 * HTTP認証コントローラー
 * JWT検証エンドポイント POST /api/auth/verify を提供
 * 
 * 【リファクタリング内容】: バリデーション処理を専用クラスに分離し、単一責任原則を適用
 * 【改善点】: 重複コードの削除、保守性向上、テスト容易性向上
 * 🟢 信頼性レベル: 既存のテストケースを維持しつつ設計品質を向上
 */
import type { Context } from 'hono';
import type { IAuthenticateUserUseCase } from '@/application/interfaces/IAuthenticateUserUseCase';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { ValidationError } from '@/shared/errors/ValidationError';
import { getDefaultAuthValidatorService, type AuthValidatorService } from '../validators/AuthValidatorFactory';
import { AuthResponseHelper } from '../responses/ResponseService';

/**
 * HTTP認証コントローラークラス
 * 
 * 【責任範囲】: HTTPリクエスト・レスポンスの処理とApplication層との連携
 * 【設計改善】: バリデーション処理をAuthValidatorServiceに委譲し、単一責任原則を適用
 * 【保守性向上】: バリデーションロジックの変更がコントローラーに影響しない構造
 */
export class AuthController {
  /**
   * 依存性注入によるコンストラクタ
   * 
   * @param authenticateUserUseCase - ユーザー認証処理を行うUseCase
   * @param validatorService - バリデーション処理を行うサービス
   */
  constructor(
    private readonly authenticateUserUseCase: IAuthenticateUserUseCase,
    private readonly validatorService: AuthValidatorService = getDefaultAuthValidatorService()
  ) {}

  /**
   * 【機能概要】: JWTトークン検証エンドポイントのメイン処理
   * 【リファクタリング後】: バリデーション処理をAuthValidatorServiceに委譲、コントローラーの責任を明確化
   * 【品質向上】: 単一責任原則、DRY原則、依存性逆転原則を適用
   * 【テスト保証】: 既存の14テストケースを維持し、同等の動作を保証
   * 🟢 信頼性レベル: 既存のテストを通しつつ設計品質を向上
   * 
   * @param c - HonoのContext（リクエスト・レスポンス情報）
   * @returns Promise<Response> - JSON形式のレスポンス
   */
  async verifyToken(c: Context): Promise<Response> {
    try {
      // 【HTTPバリデーション】: メソッド、Content-Type、URLパスの検証を統合実行
      // 🟢 【リファクタリング改善】: 重複したバリデーションコードをAuthValidatorServiceに集約
      // 【単一責任原則】: HTTPバリデーションの責任を専用サービスに移譲
      const httpValidationResult = this.validatorService.validateHttpRequest(c);
      if (!httpValidationResult.isValid) {
        return AuthResponseHelper.legacyError(
          c,
          httpValidationResult.error ?? 'HTTP validation failed',
          httpValidationResult.statusCode ?? 400
        );
      }

      // 【JSONパース処理】: リクエストボディの解析とパースエラーハンドリング 🟢
      let requestBody: any;
      try {
        requestBody = await c.req.json();
      } catch (jsonError) {
        // 【JSONパースエラー処理】: テストで期待されるJSONパースエラーケースに対応 🟡
        // 🟢 【レスポンス統一】: ResponseServiceで統一されたJSONパースエラーレスポンス
        return AuthResponseHelper.legacyError(c, 'Invalid JSON format', 400);
      }

      // 【JWTトークンバリデーション】: トークンの存在、型、長さ制限の検証を統合実行
      // 🟢 【リファクタリング改善】: トークンバリデーションロジックをAuthValidatorServiceに集約
      // 【DRY原則】: 同様のバリデーション処理の重複を排除
      const tokenValidationResult = this.validatorService.validateJwtToken(requestBody);
      if (!tokenValidationResult.isValid) {
        return AuthResponseHelper.legacyError(
          c,
          tokenValidationResult.error ?? 'Token validation failed',
          tokenValidationResult.statusCode ?? 400
        );
      }

      // 【認証UseCase呼び出し】: Application層での認証処理を実行 🟢
      const authResult = await this.authenticateUserUseCase.execute({ jwt: requestBody.token });

      // 【成功レスポンス返却】: 認証成功時のテスト互換形式レスポンス 🟢
      // 🟢 【テスト互換性】: 既存の14テストケースとの互換性を維持
      return AuthResponseHelper.legacySuccess(c, authResult.user, authResult.isNewUser);

    } catch (error) {
      // 【エラーハンドリング】: 各種エラーを適切なHTTPステータスコードに変換 🟢
      
      if (error instanceof AuthenticationError) {
        // 【認証エラー処理】: JWT検証失敗・期限切れなどの認証エラー 🟢
        return AuthResponseHelper.legacyError(c, error.message, 401);
      }

      if (error instanceof ValidationError) {
        // 【バリデーションエラー処理】: 入力値検証エラー 🟢
        return AuthResponseHelper.legacyError(c, error.message, 400);
      }

      // 【汎用エラー処理】: 外部サービスエラー・予期しないエラーの処理 🟡
      // 🟢 【ログ改善】: 本番環境では適切なロガーライブラリの使用を推奨
      console.error('AuthController verifyToken error:', error);
      return AuthResponseHelper.legacyError(c, 'Internal server error', 500);
    }
  }
}