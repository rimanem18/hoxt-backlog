/**
 * Drizzle ORM クライアント設定
 *
 * PostgreSQL接続とDrizzleインスタンスの管理
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * PostgreSQL接続設定
 * Transaction Pooler (port: 6543) 対応
 */
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/postgres';

/**
 * PostgreSQLクライアント作成
 * サーバーレス環境対応のため短時間接続設定
 */
const queryClient = postgres(connectionString, {
  // サーバーレス環境対応
  prepare: false,

  // 接続プール設定
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Drizzle ORM インスタンス
 * スキーマを含む形でエクスポート
 */
export const db = drizzle(queryClient, { schema });

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
