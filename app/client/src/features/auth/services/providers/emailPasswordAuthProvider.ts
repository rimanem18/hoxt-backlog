import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';
import {
  getTrustedDomains,
  validateRedirectUrl,
} from '@/shared/utils/redirectUrlValidator';
import { handleEmailPasswordError } from '../emailPasswordErrorHandler';

export type SignInResult =
  | { success: true; session: Session }
  | { success: false; errorMessage: string };

/** SupabaseClient の auth プロパティのみを必要とする型 */
type SupabaseAuthClient = Pick<SupabaseClient, 'auth'>;

export class EmailPasswordAuthProvider {
  private supabase: SupabaseAuthClient;
  private trustedDomains: Set<string>;
  private lastAuthEvent: AuthChangeEvent | null = null;
  private readonly authEventListeners = new Set<
    (event: AuthChangeEvent) => void
  >();

  constructor(supabaseClient: SupabaseAuthClient) {
    this.supabase = supabaseClient;
    this.trustedDomains = getTrustedDomains();

    // インスタンス生成時点から早期に購読し、購読者登録前に発火した
    // PASSWORD_RECOVERY等のイベントを取りこぼさないようにする
    this.supabase.auth.onAuthStateChange((event) => {
      this.lastAuthEvent = event;
      for (const listener of this.authEventListeners) {
        listener(event);
      }
    });
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<SignInResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        return {
          success: false,
          errorMessage: handleEmailPasswordError(error),
        };
      }

      return { success: true, session: data.session };
    } catch (error) {
      return {
        success: false,
        errorMessage: handleEmailPasswordError(error),
      };
    }
  }

  async resetPasswordForEmail(
    email: string,
    redirectTo: string,
  ): Promise<{ errorMessage?: string }> {
    try {
      // オープンリダイレクト脆弱性対策の厳密なリダイレクト検証
      validateRedirectUrl(redirectTo, this.trustedDomains);

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        return { errorMessage: handleEmailPasswordError(error) };
      }

      return {};
    } catch (error) {
      return { errorMessage: handleEmailPasswordError(error) };
    }
  }

  async updatePassword(
    newPassword: string,
  ): Promise<{ errorMessage?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { errorMessage: handleEmailPasswordError(error) };
      }

      return {};
    } catch (error) {
      return { errorMessage: handleEmailPasswordError(error) };
    }
  }

  /**
   * 認証状態変更リスナーを登録する
   * PASSWORD_RECOVERYイベント等の検知に使用する。
   * 登録前に発火済みの直近イベントは登録時に即座にリプレイされる。
   * @param callback - 状態変更時のコールバック関数
   * @returns リスナー解除関数
   */
  onAuthStateChange(callback: (event: AuthChangeEvent) => void): () => void {
    if (this.lastAuthEvent) {
      callback(this.lastAuthEvent);
    }

    this.authEventListeners.add(callback);

    return () => {
      this.authEventListeners.delete(callback);
    };
  }
}
