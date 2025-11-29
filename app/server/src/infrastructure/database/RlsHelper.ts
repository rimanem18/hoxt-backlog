/**
 * Row-Level Security（RLS）設定ヘルパー
 *
 * PostgreSQLのセッションパラメータ `app.current_user_id` を設定・クリアし、
 * RLSポリシーを適用するためのヘルパークラス。
 * トランザクションスコープ内でのみ使用すること。
 */

import { sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/postgres-js';

/**
 * Drizzle ORMインスタンスまたはトランザクションの型
 * executeメソッドを持つオブジェクトであればOK
 */
type DrizzleExecutor = Pick<ReturnType<typeof drizzle>, 'execute'>;

export class RlsHelper {
  /**
   * RLS用の現在のユーザーIDを設定
   *
   * トランザクション内でのみ呼び出すこと。
   * SET LOCALはトランザクションスコープ内でのみ有効。
   *
   * @param db - Drizzle ORMインスタンスまたはトランザクション
   * @param userId - 設定するユーザーID（UUID v4形式）
   * @throws UUID v4形式が不正な場合
   */
  public static async setCurrentUser(
    db: DrizzleExecutor,
    userId: string,
  ): Promise<void> {
    // UUID v4形式の検証（SQLインジェクション対策）
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
   *
   * @param db - Drizzle ORMインスタンスまたはトランザクション
   */
  public static async clearCurrentUser(db: DrizzleExecutor): Promise<void> {
    await db.execute(sql`SET LOCAL app.current_user_id = ''`);
  }
}
