/**
 * Drizzle ORM クライアント設定
 *
 * PostgreSQL接続とDrizzleインスタンスの管理
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
 * データベース接続終了
 * アプリケーション終了時の適切なクリーンアップ用
 */
export const closeConnection = async () => {
  await queryClient.end();
};

// 型定義のエクスポート
export { schema };
export type Database = typeof db;
