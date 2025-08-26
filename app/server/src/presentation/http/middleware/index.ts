/**
 * 【機能概要】: Presentation層ミドルウェアの統一エクスポート
 * 【実装方針】: ミドルウェアの一元管理とインポート簡素化
 * 【テスト対応】: 各ミドルウェアのテスト時のインポート統一
 * 🟢 信頼性レベル: 標準的なバレルエクスポートパターン
 */

// 【認証ミドルウェア】: JWT認証機能の提供
export { 
  authMiddleware, 
  requireAuth, 
  optionalAuth,
  type AuthMiddlewareOptions 
} from './auth/AuthMiddleware';

// 【認証エラー】: 統一されたエラークラス
export { AuthError } from './errors/AuthError';

// 【JWT検証】: JWKS検証機能の提供
export { verifyJWT, generateTestJWT } from './auth/jwks';

// 【エラーハンドリング】: 統一エラーレスポンス変換
export { errorHandlerMiddleware } from './errors/ErrorHandlerMiddleware';