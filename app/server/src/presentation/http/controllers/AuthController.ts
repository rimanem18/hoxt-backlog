/**
 * HTTP認証コントローラー
 *
 * JWT検証とユーザー認証処理を提供するHTTPエンドポイント実装。
 * Hono Contextからのリクエスト処理とJSON応答を行う。
 */
import type { Context } from 'hono';
import type { IAuthenticateUserUseCase } from '@/application/interfaces/IAuthenticateUserUseCase';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { ValidationError } from '@/shared/errors/ValidationError';
import { AuthResponseHelper } from '../responses/ResponseService';
import {
  type AuthValidatorService,
  getDefaultAuthValidatorService,
} from '../validators/AuthValidatorFactory';

/**
 * HTTP認証コントローラークラス
 *
 * HTTPリクエストのバリデーションからApplication層への委譲、
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
    private readonly validatorService: AuthValidatorService = getDefaultAuthValidatorService(),
  ) {}

  /**
   * JWTトークン検証エンドポイント
   *
   * @param c HonoのContext
   * @returns JSON形式のレスポンス
   */
  async verifyToken(c: Context): Promise<Response> {
    try {
      // HTTPリクエストの基本バリデーション
      const httpValidationResult = this.validatorService.validateHttpRequest(c);
      if (!httpValidationResult.isValid) {
        return AuthResponseHelper.legacyError(
          c,
          httpValidationResult.error ?? 'HTTP validation failed',
          httpValidationResult.statusCode ?? 400,
        );
      }

      // リクエストボディをJSONとしてパース
      let requestBody: unknown;
      try {
        requestBody = await c.req.json();
      } catch {
        // JSONパースエラーは400エラー
        return AuthResponseHelper.legacyError(c, 'Invalid JSON format', 400);
      }

      // JWTトークンのバリデーション
      const tokenValidationResult = this.validatorService.validateJwtToken(
        requestBody as any,
      );
      if (!tokenValidationResult.isValid) {
        return AuthResponseHelper.legacyError(
          c,
          tokenValidationResult.error ?? 'Token validation failed',
          tokenValidationResult.statusCode ?? 400,
        );
      }

      // Application層への委譲
      const authResult = await this.authenticateUserUseCase.execute({
        jwt: (requestBody as { token: string }).token,
      });

      // 認証成功レスポンス
      return AuthResponseHelper.legacySuccess(
        c,
        authResult.user,
        authResult.isNewUser,
      );
    } catch (error) {
      // エラーハンドリング

      if (error instanceof AuthenticationError) {
        // 認証エラーは401で返却
        return AuthResponseHelper.legacyError(c, error.message, 401);
      }

      if (error instanceof ValidationError) {
        // バリデーションエラーは400で返却
        return AuthResponseHelper.legacyError(c, error.message, 400);
      }

      // 予期しないエラーの処理
      console.error('AuthController verifyToken error:', error);
      return AuthResponseHelper.legacyError(c, 'Internal server error', 500);
    }
  }
}
