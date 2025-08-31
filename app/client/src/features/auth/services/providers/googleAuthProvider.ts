/**
 * Google認証プロバイダーの実装クラス。
 * Supabase AuthとGoogle OAuthを使用したセキュアなJWT認証を提供する。
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthProvider, User } from '@/packages/shared-schemas/src/auth';
import { parseCommaSeparated } from '@/shared/array';
import {
  type AuthResult,
  BaseAuthProvider,
  type SessionInfo,
} from './authProviderInterface';

/**
 * Google OAuth認証プロバイダー。
 * オープンリダイレクト脆弱性対策とパフォーマンス最適化を実装。
 *
 * @example
 * ```typescript
 * const provider = new GoogleAuthProvider();
 * const result = await provider.signIn({ redirectTo: '/dashboard' });
 * if (result.success) {
 *   const session = await provider.getSession();
 * }
 * ```
 */
export class GoogleAuthProvider extends BaseAuthProvider {
  private supabase: SupabaseClient;
  private trustedDomains: Set<string>;

  /**
   * GoogleAuthProviderを初期化する
   * @param supabaseClient - Supabaseクライアント（未指定時は環境変数から生成）
   */
  constructor(supabaseClient?: SupabaseClient) {
    super('google');

    // 注入されたクライアントまたは環境変数からSupabaseクライアントを初期化
    this.supabase =
      supabaseClient ||
      (() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
          throw new Error('Supabase環境変数が設定されていません');
        }

        return createClient(url, key);
      })();

    // 信頼ドメインリストを事前処理してURL検証時のパフォーマンスを向上
    const trusted_domains_raw = parseCommaSeparated(
      process.env.NEXT_PUBLIC_TRUSTED_DOMAINS,
    );
    this.trustedDomains = new Set(
      trusted_domains_raw.map((domain) => domain.toLowerCase()),
    );
  }

  /**
   * リダイレクトURLのセキュリティ検証を行う
   * オープンリダイレクト攻撃を防ぐため、URLのプロトコル・ドメインを厳密にチェックする。
   * @param redirectTo - 検証対象のリダイレクトURL
   * @throws 不正なURL、プロトコル、ドメインの場合
   */
  validateRedirectUrl(redirectTo: string): void {
    let parsedUrl: URL;
    try {
      // URLオブジェクトで厳密な解析を実行
      parsedUrl = new URL(redirectTo);
    } catch (error) {
      // 詳細なエラーはログに記録、ユーザーには安全なメッセージを返却
      console.error('Invalid URL format detected:', redirectTo, error);
      throw new Error('不正な URL 形式です');
    }

    // http/https以外のプロトコルを拒否
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      console.error(
        'Invalid protocol detected:',
        parsedUrl.protocol,
        'for URL:',
        redirectTo,
      );
      throw new Error('許可されていないプロトコルです');
    }

    // ホスト名を小文字に正規化してケースインセンシティブ攻撃を防ぐ
    const redirectHostname = parsedUrl.hostname.toLowerCase();

    // 信頼ドメインリストとの厳密な照合でオープンリダイレクト攻撃を防止
    const isTrusted = Array.from(this.trustedDomains).some((trustedDomain) => {
      // 完全一致チェック
      if (redirectHostname === trustedDomain) {
        return true;
      }
      // 正規のサブドメインかチェック（evil.com.trusted.comのような偽装を防ぐ）
      if (redirectHostname.endsWith(`.${trustedDomain}`)) {
        return redirectHostname.length > trustedDomain.length + 1;
      }
      return false;
    });

    if (!isTrusted) {
      // セキュリティログとして記録
      console.error(`Untrusted redirect URL detected: ${redirectTo}`);
      throw new Error('不正なリダイレクト先です');
    }
  }
  /**
   * Google OAuth認証フローを開始する
   * @param options - 認証オプション
   * @returns 認証結果
   */
  async signIn(options?: { redirectTo?: string }): Promise<AuthResult> {
    const redirectTo =
      options?.redirectTo ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      window.location.origin;

    try {
      // オープンリダイレクト脆弱性対策の厳密なリダイレクト検証
      this.validateRedirectUrl(redirectTo);

      // Supabase Auth経由でGoogle認証を開始
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
        },
      });

      if (error) {
        return this.handleError(error, 'Google sign in');
      }

      // リダイレクトが開始されるため処理中状態を返す
      return {
        success: true,
        provider: this.providerName,
      };
    } catch (error) {
      // 詳細なエラーはログに記録、ユーザーには安全なメッセージを返却
      console.error('Google sign in validation error:', error);
      return this.handleError(
        new Error('認証要求の処理中にエラーが発生しました'),
        'Google sign in',
      );
    }
  }

  /**
   * Google認証セッションを終了する
   * @returns ログアウト結果
   */
  async signOut(): Promise<AuthResult> {
    try {
      // Supabase Auth経由でログアウトを実行
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return this.handleError(error, 'Google sign out');
      }

      return this.createSuccessResult();
    } catch (error) {
      return this.handleError(error, 'Google sign out');
    }
  }

  /**
   * 認証済みGoogleユーザー情報を取得する
   * @returns ユーザー情報
   */
  async getUser(): Promise<{ user: User | null }> {
    try {
      // Supabase Auth経由で現在のユーザーを取得
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error) {
        console.error('Google get user error:', error.message);
        return { user: null };
      }

      if (!user) {
        return { user: null };
      }

      // Supabase UserをアプリケーションUser型に変換
      // 日時フィールドが取得できない場合は現在時刻をデフォルトとして使用
      const now = new Date().toISOString();
      const appUser: User = {
        id: user.id,
        externalId: user.id,
        provider: 'google' as AuthProvider,
        email: user.email || '',
        name:
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          'Google User',
        avatarUrl:
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        createdAt: user.created_at || now,
        updatedAt: user.updated_at || now,
        lastLoginAt: null, // Google認証では最終ログイン時刻を追跡しない
      };

      return { user: appUser };
    } catch (error) {
      console.error('Google get user error:', error);
      return { user: null };
    }
  }

  /**
   * 現在のGoogle認証セッション情報を取得する
   * パフォーマンス向上のため冗長なAPIコールを削除し、session.userを直接利用する。
   * @returns セッション情報
   */
  async getSession(): Promise<SessionInfo | null> {
    try {
      // Supabase Auth経由で現在のセッションを取得
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();

      if (error) {
        console.error('Google get session error:', error.message);
        return null;
      }

      if (!session || !session.user) {
        return null;
      }

      // パフォーマンス向上のためgetUser()呼び出しを削除してsession.userを直接利用
      const now = new Date().toISOString();
      const appUser: User = {
        id: session.user.id,
        externalId: session.user.id,
        provider: 'google' as AuthProvider,
        email: session.user.email || '',
        name:
          session.user.user_metadata?.name ||
          session.user.user_metadata?.full_name ||
          'Google User',
        avatarUrl:
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture ||
          null,
        createdAt: session.user.created_at || now,
        updatedAt: session.user.updated_at || now,
        lastLoginAt: null, // Google認証では最終ログイン時刻を追跡しない
      };

      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ? session.expires_at * 1000 : undefined, // 秒をミリ秒に変換
        user: appUser,
      };
    } catch (error) {
      console.error('Google get session error:', error);
      return null;
    }
  }

  /**
   * 認証状態変更リスナーを設定する
   * リアルタイム認証状態監視による自動UI更新を支援する。
   * @param callback - 状態変更時のコールバック関数
   * @returns リスナー解除関数
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange(async (event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED'
      ) {
        const { user } = await this.getUser();
        callback(user);
      }
    });

    // メモリリーク防止のためのクリーンアップ関数を返却
    return () => {
      subscription.unsubscribe();
    };
  }

  // resetPasswordメソッドは削除済み
  // Google OAuthではパスワードリセットは適用外のため、
  // 将来的にEmailPasswordAuthProviderクラスで実装予定
}
