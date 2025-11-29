/**
 * データベース接続管理
 *
 * Drizzle ORMのシングルトンインスタンスを提供。
 * モジュールスコープでの実装により、Node.jsモジュールキャッシュで
 * シングルトンパターンを実現。
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseConfig } from '@/infrastructure/config/env';
import * as schema from './schema';

/**
 * データベース設定を取得
 */
const dbConfig = getDatabaseConfig();

/**
 * PostgreSQLクライアント作成
 * サーバーレス環境対応のため設定可能な接続設定
 */
const queryClient = postgres(dbConfig.url, {
  // サーバーレス環境対応
  prepare: false,

  // 接続プール設定（環境変数から設定可能）
  max: dbConfig.maxConnections,
  idle_timeout: dbConfig.idleTimeoutSeconds,
  connect_timeout: dbConfig.connectTimeoutSeconds,
});

/**
 * Drizzle ORM インスタンス
 * スキーマを含む形でエクスポート
 */
export const db = drizzle(queryClient, { schema });

/**
 * トランザクション内で処理を実行
 *
 * RLS設定が必要な場合は、RlsHelperを使用してトランザクション内で設定する。
 * エラー時は自動的にロールバック。
 *
 * @param fn - トランザクション内で実行する処理
 * @returns コールバック関数の実行結果
 */
export async function executeTransaction<T>(
  fn: Parameters<typeof db.transaction>[0],
): Promise<T> {
  return (await db.transaction(fn)) as T;
}

/**
 * データベース接続終了
 * アプリケーション終了時の適切なクリーンアップ用
 */
export const closeConnection = async () => {
  await queryClient.end();
};

// 型定義のエクスポート
export { schema };
export type Database = typeof db;
