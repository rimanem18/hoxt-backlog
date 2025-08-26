/**
 * 【機能概要】: JWT認証ミドルウェア - Bearer認証でのユーザー認証処理
 * 【実装方針】: Honoミドルウェアパターンでアプリケーション全体に適用
 * 【テスト対応】: 認証成功・失敗の各ケースを単体テストで検証可能
 * 🟢 信頼性レベル: Honoベストプラクティスとo3技術提案に基づく実装
 */

import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { verifyJWT } from './jwks';
import { AuthError } from '../errors/AuthError';

/**
 * AuthMiddlewareオプション設定
 */
export interface AuthMiddlewareOptions {
  /**
   * オプショナル認証モード
   * true: 認証なしでも通す（匿名アクセス許可）
   * false: 認証必須（デフォルト）
   */
  optional?: boolean;
  
  /**
   * カスタムトークン取得関数
   * テスト時のモック認証で使用
   */
  getToken?: (c: Context) => string | null;
}

/**
 * 【認証ミドルウェア】: JWT Bearer認証の実装
 * Authorizationヘッダーからトークンを取得し、Supabase JWTを検証
 * 
 * @param options 認証オプション（optional認証、カスタムトークン取得など）
 * @returns Honoミドルウェア関数
 */
export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  return createMiddleware(async (c, next) => {
    try {
      // 【トークン取得】: AuthorizationヘッダーまたはカスタムgetToken関数
      const token = options.getToken 
        ? options.getToken(c)
        : extractBearerToken(c);

      // 【認証チェック】: トークンが存在しない場合の処理
      if (!token) {
        if (options.optional) {
          // 【オプション認証】: 匿名ユーザーとしてContext設定
          c.set('userId', null);
          c.set('claims', null);
          await next();
          return;
        } else {
          // 【認証必須】: トークン不足エラー
          throw new AuthError('TOKEN_MISSING');
        }
      }

      // 【JWT検証】: Supabase JWKS を使用したトークン検証
      const payload = await verifyJWT(token);
      
      // 【ユーザーID抽出】: JWTのsub（subject）フィールドからuserIDを取得
      const userId = payload.sub;
      if (!userId) {
        throw new AuthError('TOKEN_INVALID', 401, 'JWT にユーザーID が含まれていません');
      }

      // 【Context設定】: 認証成功時のユーザー情報をContextに保存
      c.set('userId', userId);
      c.set('claims', payload);

      // 【セキュリティログ】: 認証成功の記録（プロダクション用）
      if (process.env.NODE_ENV === 'production') {
        console.log(`[AUTH] User authenticated: ${userId}`);
      }

      // 【次の処理】: 認証成功後の後続ミドルウェア・ハンドラ実行
      await next();

    } catch (error) {
      // 【エラーハンドリング】: 認証関連エラーの統一処理

      if (error instanceof AuthError) {
        // 【既知の認証エラー】: AuthErrorはそのまま再スロー
        throw error;
      }

      // 【JWT検証エラー】: joseライブラリからのエラーを分類
      if (error instanceof Error) {
        // 【エラー種別判定】: エラーメッセージから適切なAuthErrorに変換
        if (error.message.includes('TOKEN_EXPIRED')) {
          throw new AuthError('TOKEN_EXPIRED');
        }
        if (error.message.includes('TOKEN_INVALID')) {
          throw new AuthError('TOKEN_INVALID');
        }
      }

      // 【予期外エラー】: 未知のエラーは無効トークンとして処理
      console.error('[AUTH] Unexpected authentication error:', error);
      throw new AuthError('TOKEN_INVALID', 401, 'トークン検証中に予期しないエラーが発生しました');
    }
  });
};

/**
 * 【Bearer トークン抽出】: Authorizationヘッダーからトークン部分を取得
 * RFC 6750 Bearer Token Usage に準拠した実装
 * 
 * @param c Honoコンテキスト
 * @returns トークン文字列（見つからない場合はnull）
 */
function extractBearerToken(c: Context): string | null {
  // 【ヘッダー取得】: Authorizationヘッダーの取得
  const authHeader = c.req.header('authorization') || c.req.header('Authorization');
  
  if (!authHeader) {
    return null;
  }

  // 【Bearer チェック】: "Bearer " プレフィックスの確認
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    return null;
  }

  // 【トークン抽出】: "Bearer " 以降の部分を取得
  const token = authHeader.slice(bearerPrefix.length).trim();
  
  // 【空文字チェック】: 空のトークンは無効として扱う
  return token || null;
}

/**
 * 【便利関数】: 必須認証ミドルウェア（デフォルト設定）
 */
export const requireAuth = () => authMiddleware({ optional: false });

/**
 * 【便利関数】: オプション認証ミドルウェア（匿名アクセス許可）
 */
export const optionalAuth = () => authMiddleware({ optional: true });