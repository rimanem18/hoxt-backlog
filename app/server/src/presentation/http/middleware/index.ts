/**
 * 【機能概要】: Presentation層ミドルウェアの統一エクスポート
 * 【実装方針】: ミドルウェアの一元管理とインポート簡素化
 * 【テスト対応】: 各ミドルウェアのテスト時のインポート統一
 * 🔵 信頼性レベル: 標準的なバレルエクスポートパターン
 */

// 【認証ミドルウェア】: JWT認証機能の提供
export {
  type AuthMiddlewareOptions,
  authMiddleware,
  optionalAuth,
  requireAuth,
} from './auth/AuthMiddleware';
// 【JWT検証】: JWKS検証機能の提供
export { generateTestJWT, verifyJWT } from './auth/jwks';
// 【認証エラー】: 統一されたエラークラス
export { AuthError } from './errors/AuthError';

// 【エラーハンドリング】: 統一エラーレスポンス変換
export { createErrorHandler } from './errors/ErrorHandlerMiddleware';
