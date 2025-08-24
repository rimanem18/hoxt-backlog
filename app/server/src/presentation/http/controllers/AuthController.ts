/**
 * HTTP認証コントローラー
 * JWT検証エンドポイント POST /api/auth/verify を提供
 */
import type { Context } from 'hono';
import type { IAuthenticateUserUseCase } from '@/application/interfaces/IAuthenticateUserUseCase';

/**
 * HTTP認証コントローラークラス
 * Presentation層でHTTPリクエスト・レスポンスを処理し、Application層のUseCaseと連携する
 */
export class AuthController {
  /**
   * AuthenticateUserUseCaseの依存性注入
   * @param authenticateUserUseCase - ユーザー認証処理を行うUseCase
   */
  constructor(
    private readonly authenticateUserUseCase: IAuthenticateUserUseCase
  ) {}

  /**
   * JWTトークン検証エンドポイント
   * POST /api/auth/verify でのJWT認証処理を実行
   * @param c - HonoのContext（リクエスト・レスポンス情報）
   * @returns Promise<Response> - JSON形式のレスポンス
   */
  async verifyToken(c: Context): Promise<Response> {
    // 【実装予定】: JWT認証処理のロジックをここに実装
    // 現在は空実装のため、テストは失敗する状態
    throw new Error('AuthController.verifyToken is not implemented yet');
  }
}