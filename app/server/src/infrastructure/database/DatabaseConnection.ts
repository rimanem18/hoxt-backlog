/**
 * データベース接続管理
 *
 * Drizzle ORMのシングルトンインスタンスとRLS設定ヘルパーを提供。
 * モジュールスコープでの実装により、Node.jsモジュールキャッシュで
 * シングルトンパターンを実現。
 */

import { sql } from 'drizzle-orm';
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
 * RLS用の現在のユーザーIDを設定
 *
 * トランザクション内でのみ呼び出すこと。
 * SET LOCALはトランザクションスコープ内でのみ有効。
 *
 * @param userId - 設定するユーザーID（UUID v4）
 * @throws UUID形式が不正な場合
 */
export async function setCurrentUser(userId: string): Promise<void> {
  // UUID v4 形式の検証（SQLインジェクション対策）
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error('Invalid UUID format for user ID');
  }

  // SET LOCALはパラメータ化できないため、UUID検証後にsql.rawを使用
  await db.execute(sql.raw(`SET LOCAL app.current_user_id = '${userId}'`));
}

/**
 * RLS用の現在のユーザーIDをクリア
 *
 * トランザクション内でのみ呼び出すこと。
 * 通常はfinallyブロックで呼び出してセッションをクリーンアップ。
 */
export async function clearCurrentUser(): Promise<void> {
  await db.execute(sql`SET LOCAL app.current_user_id = ''`);
}

/**
 * トランザクション内で処理を実行
 *
 * RLS設定が必要な場合は、このヘルパー内でsetCurrentUserを呼び出す。
 * エラー時は自動的にロールバック、finallyでRLSをクリア。
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
