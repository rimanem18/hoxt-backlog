import type { Context, Next } from 'hono';
import type { JwtVerificationResult } from '@/domain/services/IAuthProvider';
import { SupabaseJwtVerifier } from '@/infrastructure/auth/SupabaseJwtVerifier';
import { db } from '@/infrastructure/database/DatabaseConnection';
import { RlsHelper } from '@/infrastructure/database/RlsHelper';
import {
  DatabaseError,
  JwtVerificationError,
  RlsConfigError,
} from './errors/AuthMiddlewareErrors';

// デフォルトのJWT検証器（シングルトン）
// JWKSキャッシュを有効化するため、モジュールスコープで1度だけインスタンス化
const defaultVerifier = new SupabaseJwtVerifier();

// 依存注入可能な型定義
type VerifyFunction = (token: string) => Promise<JwtVerificationResult>;
type SetCurrentUserFunction = (db: unknown, userId: string) => Promise<void>;

/**
 * 認証ミドルウェアの依存性
 */
export interface AuthMiddlewareDependencies {
  /** JWT検証関数 */
  verifyFn: VerifyFunction;
  /** RLS設定関数 */
  setCurrentUserFn: SetCurrentUserFunction;
  /** データベース取得関数 */
  dbProvider: () => unknown;
}

/**
 * 認証ミドルウェアファクトリー
 *
 * 依存性を事前に注入した認証ミドルウェアを生成する。
 * Composition Rootでの使用を想定。
 *
 * @param deps - 依存性（verifier, rlsHelper, dbProvider）
 * @returns 認証ミドルウェア関数
 *
 * @example
 * ```typescript
 * const authMw = createAuthMiddleware({
 *   verifyFn: (token) => verifier.verifyToken(token),
 *   setCurrentUserFn: RlsHelper.setCurrentUser,
 *   dbProvider: () => db,
 * });
 * app.use('/api/*', authMw);
 * ```
 */
export function createAuthMiddleware(
  deps: AuthMiddlewareDependencies,
): (c: Context, next: Next) => Promise<Response | undefined> {
  return async (c: Context, next: Next) => {
    return authMiddlewareImpl(
      c,
      next,
      deps.verifyFn,
      deps.setCurrentUserFn,
      deps.dbProvider,
    );
  };
}

/**
 * 認証ミドルウェアの内部実装
 */
async function authMiddlewareImpl(
  c: Context,
  next: Next,
  verifyFn?: VerifyFunction,
  setCurrentUserFn?: SetCurrentUserFunction,
  dbProvider?: () => unknown,
): Promise<Response | undefined> {
  // Authorizationヘッダー取得
  const authHeader = c.req.header('Authorization');

  // ヘッダー検証（Bearer スキームのみ許可）
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      },
      401,
    );
  }

  // トークン抽出（"Bearer "の7文字をスキップ）
  const token = authHeader.substring(7).trim();

  // 空トークンチェック
  if (!token) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      },
      401,
    );
  }

  try {
    // JWT検証（依存注入またはデフォルト実装）
    const verify = verifyFn || ((t: string) => defaultVerifier.verifyToken(t));

    const result = await verify(token);

    // 検証失敗時
    if (!result.valid || !result.payload) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'JWT検証に失敗しました',
          },
        },
        401,
      );
    }

    // user_id抽出
    const userId = result.payload.sub;

    // user_id存在チェック
    if (!userId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'JWT検証に失敗しました',
          },
        },
        401,
      );
    }

    // RLS設定（依存注入またはデフォルト実装）
    const setCurrentUser = setCurrentUserFn || RlsHelper.setCurrentUser;

    // データベーストランザクションを取得（必須）
    // SET LOCALはトランザクション内でのみ有効なため、トランザクションが必須
    const database = c.get('db');
    if (!database) {
      // トランザクションが設定されていない場合は dbProvider またはグローバルシングルトン
      const fallbackDb = dbProvider ? dbProvider() : db;
      await setCurrentUser(fallbackDb as any, userId);
    } else {
      await setCurrentUser(database as any, userId);
    }

    // コンテキストにuserIdを設定
    c.set('userId', userId);

    // 次のハンドラーへ
    await next();
  } catch (error) {
    // 型ベースのエラー分類で401/500を確実に判定
    if (error instanceof DatabaseError || error instanceof RlsConfigError) {
      // DB接続エラー、RLS設定エラーは500
      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'サーバーエラーが発生しました',
          },
        },
        500,
      );
    }

    if (error instanceof JwtVerificationError) {
      // JWT検証エラーは401
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'JWT検証に失敗しました',
          },
        },
        401,
      );
    }

    // 予期しないエラーは安全側に倒して500
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      },
      500,
    );
  }
}
