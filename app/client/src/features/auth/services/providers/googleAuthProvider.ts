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
 * ドメイン文字列を正規化する
 * プロトコル、www、空白、末尾スラッシュを削除し、小文字化する
 *
 * @param domain - 正規化対象のドメイン文字列
 * @returns 正規化されたドメイン文字列
 */
export function normalizeDomain(domain: string): string {
  return domain
    .trim() // 前後空白除去
    .replace(/^https?:\/\//i, '') // プロトコル除去（ケースインセンシティブ）
    .replace(/^www\./i, '') // www. 除去（ケースインセンシティブ）
    .replace(/\/$/, '') // 末尾スラッシュ除去
    .toLowerCase(); // 小文字化
}

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
      trusted_domains_raw.map((domain) => normalizeDomain(domain)),
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

    // ホスト名（ポート含む）を小文字に正規化してケースインセンシティブ攻撃を防ぐ
    const redirectHost = parsedUrl.host.toLowerCase();

    // 信頼ドメインリストとの厳密な照合でオープンリダイレクト攻撃を防止
    const isTrusted = Array.from(this.trustedDomains).some((trustedDomain) => {
      // 完全一致チェック（ポート含む）
      if (redirectHost === trustedDomain) {
        return true;
      }
      // 正規のサブドメインかチェック（evil.com.trusted.comのような偽装を防ぐ）
      if (redirectHost.endsWith(`.${trustedDomain}`)) {
        return redirectHost.length > trustedDomain.length + 1;
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
    // createSecureRedirectUrl()を使用して環境別の適切なリダイレクト先を取得
    const { createSecureRedirectUrl } = await import('../../config/authConfig');
    const redirectTo = options?.redirectTo || createSecureRedirectUrl();

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

  /**
   * トークンの基本的な形式を検証する
   *
   * モックトークンを拒否し、JWT形式の基本チェックを行う。
   * 完全な署名検証はSupabaseに委譲する。
   */
  validateToken(token: string): boolean {
    // 空文字列やモックトークンを拒否
    if (!token || token === 'mock_access_token') {
      return false;
    }

    // JWT基本形式チェック（header.payload.signature）
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // 各パートが空でないことを確認
    return parts.every((part) => part.length > 0);
  }

  /**
   * Google OAuth コールバック処理
   * Supabase セッション確立とユーザー情報取得を実施し、
   * バックエンドの /auth/verify を呼び出してDB の User レコードを作成する
   */
  async handleCallback(
    hashParams: URLSearchParams,
  ): Promise<import('./authProviderInterface').AuthCallbackResult> {
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    // エラーハンドリング
    if (!accessToken) {
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (error === 'access_denied') {
        // ユーザーキャンセルは success=false で返す（エラーではない）
        return { success: false, user: undefined, isNewUser: false };
      }

      throw new Error(
        errorDescription || error || '認証トークンが見つかりません',
      );
    }

    // Supabase セッション確立
    const { error: sessionError } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (sessionError) {
      throw new Error(`Supabaseセッション確立エラー: ${sessionError.message}`);
    }

    // ユーザー情報取得
    const { data: userData, error: userError } =
      await this.supabase.auth.getUser();

    if (userError || !userData.user) {
      throw new Error(
        `ユーザー情報取得エラー: ${userError?.message || 'ユーザーが見つかりません'}`,
      );
    }

    // バックエンドで User レコード作成（JIT Provisioning）
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('API Base URLが設定されていません');
    }

    // 末尾スラッシュを除去して二重スラッシュを防止
    const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');
    const verifyResponse = await fetch(`${normalizedBaseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: accessToken }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      throw new Error(
        `バックエンド認証エラー: ${errorData.error?.message || 'Unknown error'}`,
      );
    }

    const verifyData = await verifyResponse.json();

    // DB の user.id を使用（Supabase の外部IDではない）
    const user: import('@/packages/shared-schemas/src/auth').User = {
      id: verifyData.data.user.id, // DB の UUID
      externalId: verifyData.data.user.externalId,
      provider: verifyData.data.user.provider,
      email: verifyData.data.user.email,
      name: verifyData.data.user.name,
      avatarUrl: verifyData.data.user.avatarUrl || null,
      createdAt: verifyData.data.user.createdAt,
      updatedAt: verifyData.data.user.updatedAt,
      lastLoginAt: verifyData.data.user.lastLoginAt || null,
    };

    return {
      success: true,
      user,
      isNewUser: verifyData.data.isNewUser,
    };
  }

  // resetPasswordメソッドは削除済み
  // Google OAuthではパスワードリセットは適用外のため、
  // 将来的にEmailPasswordAuthProviderクラスで実装予定
}
