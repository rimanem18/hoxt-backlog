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
   *
   * サーバーレス環境に最適化された設定で接続プールを作成。
   * プールは一度だけ初期化され、後続のウォームスタートで再利用される。
   */
  private static initializePool(): Pool {
    if (DatabaseConnection.pool) {
      return DatabaseConnection.pool;
    }

    try {
      const config = EnvironmentConfig.getDatabaseConfig();
      DatabaseConnection.pool = new Pool({
        connectionString: config.url,
        max: 2, // サーバーレス環境に最適化（リクエスト毎に1インスタンス=1-2接続で十分）
        idleTimeoutMillis: 5000, // アイドルタイムアウトを短く（サーバーレスの短時間実行に合わせる）
        connectionTimeoutMillis: 2000, // 接続タイムアウト
        allowExitOnIdle: true, // Lambda等でアイドル接続が原因でプロセスが終了しないのを防ぐ
      });

      // エラーハンドリング
      DatabaseConnection.pool.on('error', (err, client) => {
        console.error('PostgreSQLプールエラー:', err);
        // サーバーレス環境では異常時にプロセス終了が必要
        process.exit(-1);
      });

      return DatabaseConnection.pool;
    } catch (error) {
      throw new Error(
        `データベース接続プールの初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      const pool = DatabaseConnection.initializePool();
      return await pool.connect();
    } catch (error) {
      throw new Error(
        `データベースへの接続に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
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
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await DatabaseConnection.getConnection();
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
      const client = await DatabaseConnection.getConnection();
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
   * サーバーレス環境では通常不要だが、テスト環境等で使用される。
   */
  static async close(): Promise<void> {
    if (DatabaseConnection.pool) {
      try {
        await DatabaseConnection.pool.end();
      } catch (error) {
        console.error('プール終了時エラー:', error);
      } finally {
        DatabaseConnection.pool = null;
      }
    }
  }

  /**
   * テスト用: プールを強制的にリセットする
   *
   * テスト環境でのみ使用。環境変数変更後にプールを再初期化するため。
   */
  static resetPoolForTesting(): void {
    DatabaseConnection.pool = null;
  }
}
