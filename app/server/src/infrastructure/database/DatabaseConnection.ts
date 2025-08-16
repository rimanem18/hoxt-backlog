import { Pool, type PoolClient } from 'pg';
import { EnvironmentConfig } from '../config/EnvironmentConfig';

/**
 * データベース接続管理クラス
 * 
 * PostgreSQL接続の管理、接続プール制御、トランザクション管理を担当。
 * アプリケーション全体でのデータベース接続を統一的に管理する。
 */
export class DatabaseConnection {
  private static pool: Pool | null = null;

  /**
   * 接続プールを初期化する
   */
  private static initializePool(): void {
    if (!this.pool) {
      try {
        const config = EnvironmentConfig.getDatabaseConfig();
        this.pool = new Pool({
          connectionString: config.url,
          max: 20, // 最大接続数
          idleTimeoutMillis: 30000, // アイドルタイムアウト
          connectionTimeoutMillis: 2000, // 接続タイムアウト
        });

        // エラーハンドリング
        this.pool.on('error', (err) => {
          console.error('PostgreSQLプールエラー:', err);
        });
      } catch (error) {
        throw new Error(`データベース接続プールの初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * データベース接続を取得する
   * 
   * 接続プールから利用可能な接続を取得する。
   * 使用後は必ずreleaseを呼び出すこと。
   * 
   * @returns PostgreSQL接続クライアント
   * @throws データベース接続エラー
   */
  static async getConnection(): Promise<PoolClient> {
    try {
      this.initializePool();
      if (!this.pool) {
        throw new Error('接続プールが初期化されていません');
      }
      return await this.pool.connect();
    } catch (error) {
      throw new Error(`データベースへの接続に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * トランザクション内で処理を実行する
   * 
   * 指定されたコールバック関数をトランザクション内で実行し、
   * 成功時はコミット、エラー時は自動的にロールバックを行う。
   * 
   * @param callback - トランザクション内で実行する処理
   * @returns コールバック関数の実行結果
   * @throws トランザクション実行エラー
   */
  static async executeTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getConnection();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * データベース接続のヘルスチェック
   * 
   * データベースに正常に接続できるかを確認する。
   * ヘルスチェックエンドポイントで使用される。
   * 
   * @returns 接続が正常な場合はtrue
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getConnection();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('データベースヘルスチェック失敗:', error);
      return false;
    }
  }

  /**
   * 接続プールを終了する
   * 
   * アプリケーション終了時に呼び出し、
   * すべての接続を適切に終了する。
   */
  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}