/**
 * 認証サービスの抽象化インターフェースとDI実装
 * DIパターンによりテスト分離を実現し、supabaseへの直接依存を排除
 */

import type { Provider } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * OAuth認証レスポンスの型定義
 */
export interface AuthResponse {
  data: {
    user?: {
      id: string;
      email?: string;
    } | null;
    session?: {
      access_token: string;
      user: {
        id: string;
        email?: string;
      };
    } | null;
  };
  error: Error | null;
}

/**
 * OAuth認証オプションの型定義
 */
export interface AuthOptions {
  redirectTo?: string;
}

/**
 * 認証サービスインターフェース
 * テスト時の依存性注入とモック化を可能にする
 */
export interface AuthServiceInterface {
  /**
   * OAuth認証を開始する
   * @param provider - 認証プロバイダー（google, github等）
   * @param options - 認証オプション（redirectTo等）
   * @returns 認証結果のPromise
   */
  signInWithOAuth(
    provider: Provider,
    options?: AuthOptions,
  ): Promise<AuthResponse>;
}

/**
 * デフォルトの認証サービス実装（Supabase使用）
 */
export const createDefaultAuthService = (): AuthServiceInterface => {
  return {
    async signInWithOAuth(
      provider: Provider,
      options?: AuthOptions,
    ): Promise<AuthResponse> {
      // Supabaseの実際のsignInWithOAuthを呼び出し
      const response = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      // Supabase OAuthはリダイレクトURLを返すのみでuser/sessionは後でコールバックで取得
      return {
        data: {
          user: null, // OAuthフローではコールバック後に取得
          session: null, // OAuthフローではコールバック後に取得
        },
        error: response.error,
      };
    },
  };
};

/**
 * デフォルトの認証サービスインスタンス
 * 通常の使用時はこれを使用
 */
export const defaultAuthService = createDefaultAuthService();
