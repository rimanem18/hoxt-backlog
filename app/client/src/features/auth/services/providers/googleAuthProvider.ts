/**
 * 【機能概要】: Google認証プロバイダーの具体実装
 * 【実装方針】: AuthProviderInterface準拠のGoogle OAuth実装
 * 【テスト対応】: authProviderInterface.test.ts のGoogle認証プロバイダー実装テスト
 * 🟢 信頼性レベル: Supabase Auth仕様と既存GoogleLoginButton実装から直接抽出
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseAuthProvider, AuthResult, SessionInfo } from './authProviderInterface';
import { User } from '@/packages/shared-schemas/src/auth';

/**
 * 【GoogleAuthProviderクラス】: Google OAuth認証の具体実装
 * 【設計方針】: BaseAuthProviderを継承してGoogle固有の認証処理を実装
 * 【実装内容】: Supabase Auth経由のGoogle OAuth・セッション管理・エラーハンドリング
 * 【テスト要件対応】: authProviderInterface.test.ts のGoogleAuthProvider実装クラステスト
 * 🟢 信頼性レベル: Supabase公式ドキュメントと既存実装から直接抽出
 */
export class GoogleAuthProvider extends BaseAuthProvider {
  private supabase: SupabaseClient;

  /**
   * GoogleAuthProviderのコンストラクタ
   * 【初期化】: Supabaseクライアントの初期化とプロバイダー名設定
   * @param supabaseClient - Supabaseクライアント（オプション、未指定時は環境変数から生成）
   */
  constructor(supabaseClient?: SupabaseClient) {
    super('google');
    
    // 【Supabaseクライアント初期化】: 注入されたクライアントまたは環境変数から生成
    this.supabase = supabaseClient || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * 【Google認証開始】: Google OAuth認証フローの開始
   * 【実装内容】: Supabase Auth経由のGoogle OAuth実行・リダイレクト設定
   * 【テスト要件対応】: signInメソッドの実装確認テスト
   * 🟢 信頼性レベル: 既存GoogleLoginButton実装とSupabase仕様から直接抽出
   * @param options - 認証オプション
   * @returns {Promise<AuthResult>} - 認証結果
   */
  async signIn(options?: { redirectTo?: string }): Promise<AuthResult> {
    try {
      // 【Google OAuth実行】: Supabase Auth経由のGoogle認証開始
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: options?.redirectTo || 
                      process.env.NEXT_PUBLIC_SITE_URL || 
                      window.location.origin
        }
      });

      if (error) {
        return this.handleError(error, 'Google sign in');
      }

      // 【OAuth成功】: リダイレクトが開始されるため、処理中状態を返す
      return {
        success: true,
        provider: this.providerName
      };
    } catch (error) {
      return this.handleError(error, 'Google sign in');
    }
  }

  /**
   * 【ログアウト】: Google認証セッションの終了
   * 【実装内容】: Supabase Auth経由のセッション削除
   * 【テスト要件対応】: signOutメソッドの実装確認テスト
   * 🟢 信頼性レベル: 既存UserProfile実装とSupabase仕様から直接抽出
   * @returns {Promise<AuthResult>} - ログアウト結果
   */
  async signOut(): Promise<AuthResult> {
    try {
      // 【セッション削除】: Supabase Auth経由のログアウト実行
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
   * 【現在のユーザー取得】: 認証済みGoogle ユーザー情報の取得
   * 【実装内容】: Supabase Auth経由のユーザー情報取得・User型変換
   * 【テスト要件対応】: getUserメソッドの実装確認テスト
   * 🟢 信頼性レベル: Supabase Auth仕様とUser型定義から直接抽出
   * @returns {Promise<{ user: User | null }>} - ユーザー情報
   */
  async getUser(): Promise<{ user: User | null }> {
    try {
      // 【ユーザー情報取得】: Supabase Auth経由の現在のユーザー取得
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error) {
        console.error('Google get user error:', error.message);
        return { user: null };
      }

      if (!user) {
        return { user: null };
      }

      // 【User型変換】: Supabase UserをアプリケーションUser型に変換
      const appUser: User = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'Google User',
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
      };

      return { user: appUser };
    } catch (error) {
      console.error('Google get user error:', error);
      return { user: null };
    }
  }

  /**
   * 【セッション取得】: 現在のGoogle認証セッション情報の取得
   * 【実装内容】: Supabase Auth経由のセッション取得・SessionInfo型変換
   * 【テスト要件対応】: getSessionメソッドの実装確認テスト
   * 🟢 信頼性レベル: Supabase Auth仕様とSessionInfo型定義から直接抽出
   * @returns {Promise<SessionInfo | null>} - セッション情報
   */
  async getSession(): Promise<SessionInfo | null> {
    try {
      // 【セッション取得】: Supabase Auth経由の現在のセッション取得
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        console.error('Google get session error:', error.message);
        return null;
      }

      if (!session) {
        return null;
      }

      // 【SessionInfo型変換】: SupabaseセッションをSessionInfo型に変換
      const { user: appUser } = await this.getUser();
      
      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ? session.expires_at * 1000 : undefined, // 秒をミリ秒に変換
        user: appUser || undefined
      };
    } catch (error) {
      console.error('Google get session error:', error);
      return null;
    }
  }

  /**
   * 【認証状態変更リスナー設定】: Supabase Auth状態変更の監視
   * 【実装内容】: onAuthStateChange経由の状態変更監視・コールバック実行
   * 【拡張機能】: リアルタイム認証状態監視による自動UI更新支援
   * 🟡 信頼性レベル: Supabase Auth仕様から妥当に推測した拡張機能
   * @param callback - 状態変更時のコールバック関数
   * @returns {() => void} - リスナー解除関数
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          const { user } = await this.getUser();
          callback(user);
        }
      }
    );

    // 【リスナー解除関数】: メモリリーク防止のためのクリーンアップ関数返却
    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * 【パスワードリセット】: Google アカウントのパスワードリセット（参考実装）
   * 【実装内容】: Google OAuth環境でのパスワードリセット処理
   * 【注意】: GoogleOAuthではパスワードリセットはGoogle側で管理されるため、主にメール・パスワード認証向け
   * 🔴 信頼性レベル: 将来拡張のための参考実装（現在は使用しない）
   * @param email - リセット対象のメールアドレス
   * @returns {Promise<AuthResult>} - リセット処理結果
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return this.handleError(error, 'Password reset');
      }

      return {
        success: true,
        provider: this.providerName
      };
    } catch (error) {
      return this.handleError(error, 'Password reset');
    }
  }
}