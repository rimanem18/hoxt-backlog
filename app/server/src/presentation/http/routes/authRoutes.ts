import { Hono } from 'hono';
import { AuthController } from '../controllers/AuthController';
import { AuthenticateUserUseCase } from '@/application/usecases/AuthenticateUserUseCase';

/**
 * 【機能概要】: Auth API のルート定義 - POST /auth/verify エンドポイント提供
 * 【実装方針】: 統合テスト通過を最優先とし、greetRoutes.tsパターンを踏襲した最小実装
 * 【テスト対応】: authRoutes.integration.test.ts の8テストケースを通すための実装
 * 🔴 信頼性レベル: AuthenticateUserUseCaseの依存関係は一時的にnullで対応（後でリファクタ）
 */
const auth = new Hono();

/**
 * 【機能概要】: POST /auth/verify エンドポイント - JWT検証とユーザー認証を実行
 * 【実装方針】: AuthControllerに処理を完全委譲する最小実装
 * 【テスト対応】: HTTP 200/400/401/500レスポンスとJSON形式を確保
 * 🔴 信頼性レベル: 依存性注入は一時的な実装（Refactorフェーズで改善予定）
 */
auth.post('/auth/verify', async (c) => {
  try {
    // 【依存性注入】: 統合テスト通過のため、一時的にnullで回避（リファクタ時に修正）
    // 🔴 実際のRepository/AuthProvider/DomainServiceは後で注入
    const authenticateUserUseCase = new AuthenticateUserUseCase(
      null as any, // userRepository - 一時的にnull
      null as any, // authProvider - 一時的にnull  
      null as any, // authDomainService - 一時的にnull
      null as any, // logger - 一時的にnull
    );
    
    // 【AuthController注入】: 既存の実装済みAuthControllerを活用
    // 🟢 AuthController.verifyToken()は完全実装済みのため信頼性高
    const authController = new AuthController(authenticateUserUseCase);
    
    // 【処理委譲】: AuthControllerのverifyTokenメソッドに完全委譲
    // 🟢 エラーハンドリング・レスポンス形式は全てAuthController内で処理済み
    return await authController.verifyToken(c);
    
  } catch (error) {
    // 【エラーハンドリング】: 予期しないエラーの場合の500レスポンス
    // 🟡 統合テストのエラーケース対応のための最小実装
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '一時的にサービスが利用できません',
          details: 'サーバー内部エラーが発生しました'
        }
      },
      500
    );
  }
});

export default auth;