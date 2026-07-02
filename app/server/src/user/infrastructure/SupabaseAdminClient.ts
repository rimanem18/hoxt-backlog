import type { ISupabaseAdminClient } from '@/user/application/ISupabaseAdminClient';

/**
 * Supabase Admin REST API ラッパー（service_role キー使用）
 *
 * service_role キーは環境変数からのみ取得し、ログへの出力を禁止する。
 * EmailSignupUseCase 専用のシングルトン実装。
 */
export class SupabaseAdminClient implements ISupabaseAdminClient {
  private static instance: SupabaseAdminClient | null = null;

  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;

  private constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.serviceRoleKey = serviceRoleKey;
  }

  static getInstance(): SupabaseAdminClient {
    if (!SupabaseAdminClient.instance) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL environment variable is required');
      }
      if (!serviceRoleKey) {
        throw new Error(
          'SUPABASE_SERVICE_ROLE_KEY environment variable is required',
        );
      }

      SupabaseAdminClient.instance = new SupabaseAdminClient(
        supabaseUrl,
        serviceRoleKey,
      );
    }

    return SupabaseAdminClient.instance;
  }

  async signUp(
    email: string,
    password: string,
  ): Promise<{ userId: string | null; error: Error | null }> {
    try {
      const response = await fetch(`${this.supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = (await response.json()) as {
          msg?: string;
          error_description?: string;
          message?: string;
        };
        const message =
          body.msg ?? body.error_description ?? body.message ?? 'signup failed';
        return { userId: null, error: new Error(message) };
      }

      const data = (await response.json()) as { id?: string };
      return { userId: data.id ?? null, error: null };
    } catch (err) {
      // ネットワーク障害・タイムアウト・JSON パース失敗などを正規化
      const error = err instanceof Error ? err : new Error(String(err));
      return { userId: null, error };
    }
  }
}
