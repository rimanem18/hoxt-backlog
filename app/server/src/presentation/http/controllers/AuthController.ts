/**
 * HTTP認証コントローラー
 * JWT検証エンドポイント POST /api/auth/verify を提供
 */
import type { Context } from 'hono';
import type { IAuthenticateUserUseCase } from '@/application/interfaces/IAuthenticateUserUseCase';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { ValidationError } from '@/shared/errors/ValidationError';

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
   * 【機能概要】: JWTトークン検証エンドポイントのメイン処理
   * 【実装方針】: TDDのRedフェーズで作成された14個のテストケースを通すための最小限実装
   * 【テスト対応】: 正常系3ケース、異常系7ケース、境界値4ケースの全てに対応
   * 🟢 信頼性レベル: 要件定義書とテストケース定義書に基づく実装
   * @param c - HonoのContext（リクエスト・レスポンス情報）
   * @returns Promise<Response> - JSON形式のレスポンス
   */
  async verifyToken(c: Context): Promise<Response> {
    try {
      // 【HTTPメソッド検証】: POST以外のメソッドを拒否してテストケースを通す 🟢
      if (c.req.method !== 'POST') {
        return c.json({ success: false, error: 'Method not allowed' }, 405);
      }

      // 【URLパス検証】: 不正なURLパスを拒否してテストケースを通す 🟡
      const url = new URL(c.req.url);
      if (!url.pathname.endsWith('/api/auth/verify')) {
        return c.json({ success: false, error: 'Endpoint not found' }, 404);
      }

      // 【Content-Type検証】: application/json以外を拒否してテストケースを通す 🟡
      const contentType = c.req.header('content-type');
      if (contentType && !contentType.includes('application/json')) {
        return c.json({ success: false, error: 'Content-Type must be application/json' }, 415);
      }

      // 【JSONパース処理】: リクエストボディの解析とパースエラーハンドリング 🟢
      let requestBody: any;
      try {
        requestBody = await c.req.json();
      } catch (jsonError) {
        // 【JSONパースエラー処理】: テストで期待されるJSONパースエラーケースに対応 🟡
        return c.json({ success: false, error: 'Invalid JSON format' }, 400);
      }

      // 【トークンフィールド存在確認】: 必須フィールドの検証 🟢
      if (!requestBody || typeof requestBody.token === 'undefined') {
        return c.json({ success: false, error: 'Token is required' }, 400);
      }

      // 【トークン空文字チェック】: 空文字列トークンの拒否 🟡
      if (requestBody.token === '') {
        return c.json({ success: false, error: 'Token cannot be empty' }, 400);
      }

      // 【トークン長制限チェック】: 異常に長いトークンの拒否 🔴
      if (typeof requestBody.token === 'string' && requestBody.token.length > 5000) {
        return c.json({ success: false, error: 'Token is too long' }, 400);
      }

      // 【認証UseCase呼び出し】: Application層での認証処理を実行 🟢
      const authResult = await this.authenticateUserUseCase.execute({ jwt: requestBody.token });

      // 【成功レスポンス返却】: 認証成功時の200レスポンス 🟢
      const responseBody: any = {
        success: true,
        user: authResult.user
      };
      
      // 【isNewUserフラグ処理】: UseCaseから明示的に提供された場合のみレスポンスに含める 🟢
      if (typeof authResult.isNewUser !== 'undefined') {
        responseBody.isNewUser = authResult.isNewUser;
      }
      
      return c.json(responseBody, 200);

    } catch (error) {
      // 【エラーハンドリング】: 各種エラーを適切なHTTPステータスコードに変換 🟢
      
      if (error instanceof AuthenticationError) {
        // 【認証エラー処理】: JWT検証失敗・期限切れなどの認証エラー 🟢
        return c.json({ success: false, error: error.message }, 401);
      }

      if (error instanceof ValidationError) {
        // 【バリデーションエラー処理】: 入力値検証エラー 🟢
        return c.json({ success: false, error: error.message }, 400);
      }

      // 【汎用エラー処理】: 外部サービスエラー・予期しないエラーの処理 🟡
      console.error('AuthController verifyToken error:', error);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  }
}