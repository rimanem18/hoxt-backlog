import { Pool, type PoolClient } from 'pg';
import { getDatabaseConfig } from '../config/env';

/**
 * モジュールスコープの接続プール
 *
 * サーバーレス環境に最適化された設定で接続プールを管理。
 * プールは一度だけ初期化され、後続のウォームスタートで再利用される。
 */
let pool: Pool | null = null;

/**
 * 接続プールを取得する
 *
 * プールが未初期化の場合は新規作成し、既存の場合はそれを返却する。
 * サーバーレス環境に最適化された設定で初期化される。
 *
 * @returns PostgreSQL接続プール
 * @throws プール初期化エラー
 */
export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  try {
    const config = getDatabaseConfig();
    pool = new Pool({
      connectionString: config.url,
      max: 2, // サーバーレス環境に最適化（リクエスト毎に1インスタンス=1-2接続で十分）
      idleTimeoutMillis: 5000, // アイドルタイムアウトを短く（サーバーレスの短時間実行に合わせる）
      connectionTimeoutMillis: 2000, // 接続タイムアウト
      allowExitOnIdle: true, // Lambda等でアイドル接続が原因でプロセスが終了しないのを防ぐ
    });

    // エラーハンドリング
    pool.on('error', (err, _client) => {
      console.error('PostgreSQLプールエラー:', err);
      // サーバーレス環境では異常時にプロセス終了が必要
      process.exit(-1);
    });

    return pool;
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
export async function getConnection(): Promise<PoolClient> {
  try {
    const poolInstance = getPool();
    return await poolInstance.connect();
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
export async function executeTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getConnection();
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
export async function healthCheck(): Promise<boolean> {
  try {
    const client = await getConnection();
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
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
    } catch (error) {
      console.error('プール終了時エラー:', error);
    } finally {
      pool = null;
    }
  }
}

/**
 * テスト用: プールを強制的にリセットする
 *
 * テスト環境でのみ使用。環境変数変更後にプールを再初期化するため。
 */
export function resetPoolForTesting(): void {
  pool = null;
}
