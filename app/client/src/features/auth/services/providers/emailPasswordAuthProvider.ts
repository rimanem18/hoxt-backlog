import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { handleEmailPasswordError } from '../emailPasswordErrorHandler';

export type SignInResult =
  | { success: true; session: Session }
  | { success: false; errorMessage: string };

export class EmailPasswordAuthProvider {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
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
}
