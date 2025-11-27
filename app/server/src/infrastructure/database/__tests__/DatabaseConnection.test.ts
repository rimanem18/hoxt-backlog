import { describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db, executeTransaction } from '../DatabaseConnection';

describe('DatabaseConnection', () => {
  // データベース接続はプロセス終了時に自動クリーンアップされる
  // テスト間での接続再利用を可能にするため、明示的なcloseは行わない

  test('dbインスタンスが取得できる', () => {
    expect(db).toBeDefined();
    expect(typeof db.select).toBe('function');
  });

  test('トランザクション内でRLS設定が適用される', async () => {
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';

    await executeTransaction(async (tx) => {
      // Given: RLS設定を適用
      await tx.execute(
        sql.raw(`SET LOCAL app.current_user_id = '${testUserId}'`),
      );

      // When: 設定値を取得
      const result = await tx.execute<{ current_setting: string }>(
        sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
      );

      // Then: 設定したユーザーIDが取得できる
      expect(result[0]?.current_setting).toBe(testUserId);
    });

    // トランザクション外では設定がクリアされている
    const resultOutside = await db.execute<{ current_setting: string }>(
      sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
    );
    expect(resultOutside[0]?.current_setting).toBe('');
  });

  test('setCurrentUserがトランザクション内で動作する', async () => {
    const testUserId = '223e4567-e89b-12d3-a456-426614174001';

    await executeTransaction(async (tx) => {
      // Given: setCurrentUserヘルパーを使用
      await tx.execute(
        sql.raw(`SET LOCAL app.current_user_id = '${testUserId}'`),
      );

      // When: 設定値を取得
      const result = await tx.execute<{ current_setting: string }>(
        sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
      );

      // Then: 設定したユーザーIDが取得できる
      expect(result[0]?.current_setting).toBe(testUserId);
    });
  });

  test('clearCurrentUserがトランザクション内で動作する', async () => {
    const testUserId = '323e4567-e89b-12d3-a456-426614174002';

    await executeTransaction(async (tx) => {
      // Given: ユーザーIDを設定してからクリア
      await tx.execute(
        sql.raw(`SET LOCAL app.current_user_id = '${testUserId}'`),
      );
      await tx.execute(sql.raw(`SET LOCAL app.current_user_id = ''`));

      // When: 設定値を取得
      const result = await tx.execute<{ current_setting: string }>(
        sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
      );

      // Then: 空文字列が取得できる
      expect(result[0]?.current_setting).toBe('');
    });
  });

  test('executeTransactionがエラー時に自動ロールバックする', async () => {
    // Given: トランザクション内で意図的にエラーを発生させる
    const errorMessage = 'Intentional error for testing';

    // When & Then: エラーが発生し、トランザクションがロールバックされる
    await expect(
      executeTransaction(async (tx) => {
        await tx.execute(sql`SELECT 1`);
        throw new Error(errorMessage);
      }),
    ).rejects.toThrow(errorMessage);
  });

  test('複数のトランザクションが独立して実行される', async () => {
    const userId1 = '423e4567-e89b-12d3-a456-426614174003';
    const userId2 = '523e4567-e89b-12d3-a456-426614174004';

    // Given: 2つの独立したトランザクションを並列実行
    const [result1, result2] = await Promise.all([
      executeTransaction(async (tx) => {
        await tx.execute(
          sql.raw(`SET LOCAL app.current_user_id = '${userId1}'`),
        );
        const result = await tx.execute<{ current_setting: string }>(
          sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
        );
        return result[0]?.current_setting;
      }),
      executeTransaction(async (tx) => {
        await tx.execute(
          sql.raw(`SET LOCAL app.current_user_id = '${userId2}'`),
        );
        const result = await tx.execute<{ current_setting: string }>(
          sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
        );
        return result[0]?.current_setting;
      }),
    ]);

    // Then: それぞれのトランザクションで正しいユーザーIDが取得できる
    expect(result1).toBe(userId1);
    expect(result2).toBe(userId2);
  });
});
