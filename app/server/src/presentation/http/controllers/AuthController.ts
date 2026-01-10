/**
 * HTTP認証コントローラー
 *
 * JWT検証とユーザー認証処理を提供するHTTPエンドポイント実装。
 * Hono Contextからのリクエスト処理とレスポンス生成を行う。
 *
 * @example
 * ```typescript
 * const controller = new AuthController(authenticateUseCase);
 * const response = await controller.verifyToken(context);
 * ```
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
 * HTTPリクエストのバリデーション、Application層への委譲、
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
      // HTTPリクエストの基本バリデーション実行
      const httpValidationResult = this.validatorService.validateHttpRequest(c);
      if (!httpValidationResult.isValid) {
        return AuthResponseHelper.validationFailed(
          c,
          httpValidationResult.error ?? 'HTTP validation failed',
          httpValidationResult.statusCode ?? 400,
        );
      }

      // リクエストボディのJSONパース
      let requestBody: unknown;
      try {
        requestBody = await c.req.json();
      } catch {
        // JSONパース失敗時は400エラーを返却
        return AuthResponseHelper.jsonParseError(c);
      }

      // JWTトークンの構造バリデーション
      const tokenValidationResult = this.validatorService.validateJwtToken(
        requestBody as { token?: string },
      );
      if (!tokenValidationResult.isValid) {
        return AuthResponseHelper.validationFailed(
          c,
          tokenValidationResult.error ?? 'Token validation failed',
          tokenValidationResult.statusCode ?? 400,
        );
      }

      // Application層のUseCaseへ処理委譲
      const authResult = await this.authenticateUserUseCase.execute({
        jwt: (requestBody as { token: string }).token,
      });

      // 認証成功時のレスポンス生成
      return AuthResponseHelper.success(
        c,
        authResult.user,
        authResult.isNewUser,
      );
    } catch (error) {
      // エラー種別に応じたレスポンス生成

      if (error instanceof AuthenticationError) {
        // 認証エラーは401ステータスで返却
        return AuthResponseHelper.authenticationError(c, error);
      }

      if (error instanceof ValidationError) {
        // バリデーションエラーは400ステータスで返却
        return AuthResponseHelper.validationError(c, error);
      }

      // 予期しないエラーは500ステータスで返却
      console.error('Unexpected error in AuthController:', error);
      return AuthResponseHelper.genericError(c, error);
    }
  }
}
