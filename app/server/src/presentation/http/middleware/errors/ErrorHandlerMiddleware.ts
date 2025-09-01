/**
 * 【機能概要】: 統一エラーハンドリングミドルウェア（設計仕様準拠）
 * 【実装方針】: AuthErrorを適切なHTTPレスポンスに変換
 * 【テスト対応】: エラーレスポンス形式の統合テスト可能
 * 🟢 信頼性レベル: api-endpoints.md統一レスポンス仕様準拠
 */

import { createMiddleware } from 'hono/factory';
import type { ErrorResponse } from '@/packages/shared-schemas/src/api';
import { AuthError } from './AuthError';

/**
 * 【エラーハンドリングミドルウェア】: AuthError等をHTTPレスポンスに変換
 * AuthMiddlewareから送出されたAuthErrorを適切なHTTPレスポンスに変換
 */
export const errorHandlerMiddleware = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (error) {
    // 【認証エラー】: AuthErrorの場合は統一エラーレスポンス生成
    if (error instanceof AuthError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: error.code, // AUTHENTICATION_REQUIRED
          message: error.message, // 'ログインが必要です'
        },
      };

      return c.json(errorResponse, error.status as 401);
    }

    // 【予期外エラー】: その他のエラーは内部サーバーエラーとして処理
    console.error('[ERROR] Unexpected error:', error);

    const internalErrorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '一時的にサービスが利用できません',
      },
    };

    return c.json(internalErrorResponse, 500);
  }
});
