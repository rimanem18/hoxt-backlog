/*
 * JWT認証ミドルウェア
 * Bearer認証でのユーザー認証処理とContext設定を提供する。
 */

import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import { isValidAuthProvider } from '@/domain/user/AuthProvider';
import type { IUserRepository } from '@/domain/user/IUserRepository';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import { AuthError } from '../errors/AuthError';
import { verifyJWT } from './jwks';

/*
 * AuthMiddlewareオプション設定
 */
export interface AuthMiddlewareOptions {
  // オプショナル認証モード（true: 匿名アクセス許可）
  optional?: boolean;

  // カスタムトークン取得関数（テスト時のモック認証で使用）
  getToken?: (c: Context) => string | null;

  // カスタムAuthProvider（テスト時のモック注入で使用）
  authProvider?: IAuthProvider;

  // カスタムUserRepository（テスト時のモック注入で使用）
  userRepository?: IUserRepository;

  // テスト用モックペイロード（JWT検証をバイパス）
  mockPayload?: {
    sub: string;
    email?: string;
    app_metadata?: {
      provider: string;
      providers: string[];
    };
    user_metadata?: {
      name?: string;
      avatar_url?: string;
      email?: string;
      full_name?: string;
    };
    iss?: string;
    iat?: number;
    exp?: number;
  };
}

/*
 * JWT Bearer認証ミドルウェア
 * @param options 認証オプション
 * @returns Honoミドルウェア関数
 */
export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  return createMiddleware(async (c, next) => {
    try {
      // トークン取得（Authorizationヘッダーまたはカスタム関数）
      const token = options.getToken
        ? options.getToken(c)
        : extractBearerToken(c);

      // トークン不存在時の処理
      if (!token) {
        if (options.optional) {
          // 匿名ユーザーとして処理続行
          c.set('userId', null);
          c.set('claims', null);
          await next();
          return;
        } else {
          throw new AuthError('AUTHENTICATION_REQUIRED');
        }
      }

      // JWT検証実行（テスト用モックペイロードがあれば使用）
      const payload =
        options.mockPayload || (await verifyJWT(token, options.authProvider));

      // 外部IDとプロバイダーを取得
      const externalId = payload.sub;
      const providerStr =
        (payload.app_metadata as { provider?: string })?.provider || 'google';

      // プロバイダーの実行時バリデーション
      if (!isValidAuthProvider(providerStr)) {
        throw new AuthError(
          'AUTHENTICATION_REQUIRED',
          401,
          `サポートされていないプロバイダー: ${providerStr}`,
        );
      }

      const provider = providerStr as
        | 'google'
        | 'github'
        | 'facebook'
        | 'microsoft'
        | 'apple'
        | 'line';

      if (!externalId) {
        throw new AuthError(
          'AUTHENTICATION_REQUIRED',
          401,
          'JWT にユーザーID が含まれていません',
        );
      }

      // DBから実際のusers.idを検索
      // テスト環境ではモックが注入される前提、本番環境ではDIContainerから取得
      const userRepository =
        options.userRepository || AuthDIContainer.getUserRepository();

      const user = await userRepository.findByExternalId(externalId, provider);

      if (!user) {
        throw new AuthError(
          'USER_NOT_FOUND',
          401,
          'ユーザーが見つかりません。先に /auth/verify を呼び出してください',
        );
      }

      // DBのusers.idをcontextにセット
      c.set('userId', user.id);
      c.set('claims', payload);

      // 認証成功ログ（本番環境）
      if (process.env.NODE_ENV === 'production') {
        console.log(`[AUTH] User authenticated: ${user.id}`);
      }

      await next();
    } catch (error) {
      // 既知の認証エラーはそのまま再スロー
      if (error instanceof AuthError) {
        throw error;
      }

      // JWT検証エラーを統一エラーに変換
      if (error instanceof Error) {
        console.warn('[AUTH] JWT検証エラー:', {
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        throw new AuthError(
          'AUTHENTICATION_REQUIRED',
          401,
          'ログインが必要です',
        );
      }

      // 未知のエラーも統一エラーとして処理
      console.error('[AUTH] Unexpected authentication error:', error);
      throw new AuthError('AUTHENTICATION_REQUIRED', 401, 'ログインが必要です');
    }
  });
};

/*
 * Authorizationヘッダーからトークンを抽出
 * @param c Honoコンテキスト
 * @returns トークン文字列（見つからない場合はnull）
 */
function extractBearerToken(c: Context): string | null {
  const authHeader =
    c.req.header('authorization') || c.req.header('Authorization');

  if (!authHeader) {
    return null;
  }

  // "Bearer " プレフィックス確認
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    return null;
  }

  // "Bearer " 以降のトークン部分を取得
  const token = authHeader.slice(bearerPrefix.length).trim();

  return token || null;
}

/*
 * 必須認証ミドルウェア
 */
export const requireAuth = () => authMiddleware({ optional: false });

/*
 * オプション認証ミドルウェア（匿名アクセス許可）
 */
export const optionalAuth = () => authMiddleware({ optional: true });
