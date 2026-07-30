import { db } from '@/shared/database/DatabaseConnection';

/**
 * システムヘルスチェックサービス実装
 *
 * データベース接続確認を実行し、依存関係の健全性状態を判定する
 * Infrastructure層のサービス実装。
 */
export class HealthCheckService {
  /**
   * データベース接続の健全性を確認する
   *
   * @returns データベースの健全性状態
   */
  async checkDatabaseHealth(): Promise<'healthy' | 'unhealthy'> {
    try {
      await db.execute('SELECT 1');
      return 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
      return 'unhealthy';
    }
  }

  /**
   * 全依存関係のヘルスチェックを実行する
   *
   * @returns ヘルスチェック結果
   */
  async checkOverallHealth() {
    const databaseStatus = await this.checkDatabaseHealth();

    return {
      status: databaseStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        database: databaseStatus,
      },
    };
  }
}
