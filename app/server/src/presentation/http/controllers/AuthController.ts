/**
 * HTTP認証コントローラー
 * 
 * POST /api/auth/verify エンドポイントでJWT検証を実行する。
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
 * HTTPリクエストの受信・バリデーションからApplication層への委譲、
 * レスポンス生成までを管理する。
 */
export class AuthController {
  /**
   * AuthControllerのコンストラクタ
   *
   * @param authenticateUserUseCase ユーザー認証処理を行うUseCase
   * @param validatorService バリデーション処理を行うサービス
   */
  constructor(
    private readonly authenticateUserUseCase: IAuthenticateUserUseCase,
    private readonly validatorService: AuthValidatorService = getDefaultAuthValidatorService()
  ) {}

  /**
   * JWTトークン検証エンドポイント
   *
   * @param c HonoのContext（リクエスト・レスポンス情報）
   * @returns JSON形式のレスポンス
   */
  async verifyToken(c: Context): Promise<Response> {
    try {
      // HTTPリクエストの基本バリデーション（メソッド、Content-Type、URLパス）
      const httpValidationResult = this.validatorService.validateHttpRequest(c);
      if (!httpValidationResult.isValid) {
        return AuthResponseHelper.legacyError(
          c,
          httpValidationResult.error ?? 'HTTP validation failed',
          httpValidationResult.statusCode ?? 400
        );
      }

      // リクエストボディをJSONとしてパース
      let requestBody: any;
      try {
        requestBody = await c.req.json();
      } catch (jsonError) {
        // JSONパースエラーの場合は400エラーを返す
        return AuthResponseHelper.legacyError(c, 'Invalid JSON format', 400);
      }

      // JWTトークンのバリデーション（存在、型、長さ制限）
      const tokenValidationResult = this.validatorService.validateJwtToken(requestBody);
      if (!tokenValidationResult.isValid) {
        return AuthResponseHelper.legacyError(
          c,
          tokenValidationResult.error ?? 'Token validation failed',
          tokenValidationResult.statusCode ?? 400
        );
      }

      // Application層の認証UseCaseを呼び出し
      const authResult = await this.authenticateUserUseCase.execute({ jwt: requestBody.token });

      // 認証成功時のレスポンスを返却
      return AuthResponseHelper.legacySuccess(c, authResult.user, authResult.isNewUser);

    } catch (error) {
      // エラーハンドリング - 各種エラーを適切なHTTPステータスコードに変換
      
      if (error instanceof AuthenticationError) {
        // JWT検証失敗・期限切れ等の認証エラーは401で返却
        return AuthResponseHelper.legacyError(c, error.message, 401);
      }

      if (error instanceof ValidationError) {
        // 入力値検証エラーは400で返却
        return AuthResponseHelper.legacyError(c, error.message, 400);
      }

      // 外部サービスエラー・予期しないエラーの処理
      console.error('AuthController verifyToken error:', error);
      return AuthResponseHelper.legacyError(c, 'Internal server error', 500);
    }
  }
}