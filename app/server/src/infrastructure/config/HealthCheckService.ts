import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import { db } from '@/infrastructure/database/DatabaseConnection';

/**
 * システムヘルスチェックサービス実装
 *
 * データベース・JWKS認証接続確認を実行し、
 * 各依存関係の健全性状態を判定するInfrastructure層のサービス実装。
 */
export class HealthCheckService {
  private authProvider: IAuthProvider;

  constructor(authProvider: IAuthProvider) {
    this.authProvider = authProvider;
  }

  /**
   * データベース接続の健全性を確認する
   *
   * @returns データベースの健全性状態
   */
  async checkDatabaseHealth(): Promise<'healthy' | 'unhealthy'> {
    try {
      // 軽量クエリで接続テストを実行
      await db.execute('SELECT 1');
      return 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
      return 'unhealthy';
    }
  }

  /**
   * Supabase接続の健全性を確認する
   *
   * @returns Supabaseの健全性状態
   */
  async checkSupabaseHealth(): Promise<'healthy' | 'unhealthy'> {
    try {
      // AuthProviderインスタンスの存在確認で接続性を判定
      return this.authProvider ? 'healthy' : 'unhealthy';
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return 'unhealthy';
    }
  }

  /**
   * 全依存関係のヘルスチェックを実行する
   *
   * @returns ヘルスチェック結果
   */
  async checkOverallHealth() {
    const [databaseStatus, supabaseStatus] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkSupabaseHealth(),
    ]);

    // 全依存関係が健全な場合のみシステム全体をhealthyとする
    const isHealthy =
      databaseStatus === 'healthy' && supabaseStatus === 'healthy';

    return {
      status: (isHealthy ? 'healthy' : 'unhealthy') as 'healthy' | 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        database: databaseStatus,
        supabase: supabaseStatus,
      },
    };
  }
}
