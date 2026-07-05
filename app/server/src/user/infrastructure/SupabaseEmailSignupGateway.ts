import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IEmailSignupGateway } from '@/user/application/IEmailSignupGateway';

/**
 * Supabase Auth 公開サインアップ API のラッパー（publishable キー使用）
 *
 * signUp は Supabase の公開エンドポイントであり admin 操作ではないため、
 * service_role / secret key ではなく publishable キーで動作する。
 * EmailSignupUseCase 専用のシングルトン実装。
 */
export class SupabaseEmailSignupGateway implements IEmailSignupGateway {
  private static instance: SupabaseEmailSignupGateway | null = null;

  private constructor(private readonly client: SupabaseClient) {}

  static getInstance(): SupabaseEmailSignupGateway {
    if (!SupabaseEmailSignupGateway.instance) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL environment variable is required');
      }
      if (!publishableKey) {
        throw new Error(
          'SUPABASE_PUBLISHABLE_KEY environment variable is required',
        );
      }

      const client = createClient(supabaseUrl, publishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      SupabaseEmailSignupGateway.instance = new SupabaseEmailSignupGateway(
        client,
      );
    }

    return SupabaseEmailSignupGateway.instance;
  }

  /**
   * テスト用: 注入済み SupabaseClient からインスタンスを生成する
   *
   * fail-fast のため NODE_ENV=test 以外での呼び出しは例外を投げる。
   */
  static createForTesting(client: SupabaseClient): SupabaseEmailSignupGateway {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('createForTesting is only available in test environment');
    }

    return new SupabaseEmailSignupGateway(client);
  }

  async signUp(
    email: string,
    password: string,
  ): Promise<{ userId: string | null; error: Error | null }> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
      });

      if (error !== null) {
        return { userId: null, error };
      }

      return { userId: data.user?.id ?? null, error: null };
    } catch (err) {
      // ネットワーク障害・タイムアウトなどを正規化
      const error = err instanceof Error ? err : new Error(String(err));
      return { userId: null, error };
    }
  }
}
