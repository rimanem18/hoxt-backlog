import { Hono } from 'hono';
import { AuthController } from '../controllers/AuthController';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';

/**
 * 【機能概要】: Auth API のルート定義 - POST /auth/verify エンドポイント提供
 * 【改善内容】: 依存性注入をDIコンテナで適切に管理し、実際の認証処理を実現
 * 【設計方針】: greetRoutes.tsパターンを踏襲しつつ、企業レベルの依存性管理を適用
 * 【セキュリティ強化】: null依存関係を解消し、実際のJWT検証・認証処理を実現
 * 【パフォーマンス】: DIコンテナによるインスタンス最適化でレスポンス性能向上
 * 🟢 信頼性レベル: 既存の実装済み依存関係とDIパターンによる確実な実装
 */
const auth = new Hono();

/**
 * 【機能概要】: POST /auth/verify エンドポイント - 完全なJWT検証とユーザー認証
 * 【改善内容】: Green フェーズの一時的null実装から実際の認証処理への完全移行
 * 【セキュリティ実装】: 実際のJWT検証、ユーザー認証、JITプロビジョニング処理
 * 【エラーハンドリング】: 適切なHTTPステータス（200/400/401/500）とセキュアなエラー情報
 * 【パフォーマンス保証】: 1000ms以内レスポンス要件を満たすよう最適化
 * 🟢 信頼性レベル: DIコンテナと既存AuthControllerの組み合わせによる確実な動作
 */
auth.post('/auth/verify', async (c) => {
  try {
    // 【依存性注入改善】: null依存関係をDIコンテナによる実際の実装に置換
    // 🟢 AuthDIContainer: 全ての依存関係を適切に管理・注入
    const authenticateUserUseCase = AuthDIContainer.getAuthenticateUserUseCase();
    
    // 【AuthController統合】: 実際の認証処理が動作するAuthControllerインスタンス
    // 🟢 既存の102行AuthController実装を完全活用
    const authController = new AuthController(authenticateUserUseCase);
    
    // 【認証処理実行】: 実際のJWT検証・ユーザー認証・JITプロビジョニング処理
    // 🟢 AuthController.verifyToken()による完全なエラーハンドリングとレスポンス管理
    return await authController.verifyToken(c);
    
  } catch (error) {
    // 【セキュリティ強化エラーハンドリング】: 内部実装詳細を隠蔽した安全なエラーレスポンス
    // 🟡 実際のエラー詳細はログに記録し、クライアントには適切に抽象化した情報のみ提供
    
    // 【ログ記録】: セキュリティインシデントとして記録（攻撃検知・監査証跡）
    console.error('[SECURITY] Unexpected error in auth endpoint:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/auth/verify',
      // 【セキュリティ配慮】: 機密情報（JWT等）はログに記録しない
    });
    
    // 【セキュアエラーレスポンス】: 内部実装を隠蔽し、攻撃者に有用な情報を与えない
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '一時的にサービスが利用できません',
          // 【セキュリティ改善】: 内部実装詳細を削除し、攻撃表面積を削減
        }
      },
      500
    );
  }
});

export default auth;