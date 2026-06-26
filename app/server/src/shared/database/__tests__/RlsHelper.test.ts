import { describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { executeTransaction } from '../DatabaseConnection';
import { RlsHelper } from '../RlsHelper';

describe('RlsHelper', () => {
  describe('setCurrentUser', () => {
    test('有効なUUID v4形式で成功する', async () => {
      // UUID v4: 4番目のグループが4で始まり、3番目のグループが8,9,a,bのいずれか
      const validUserId = '550e8400-e29b-41d4-a716-446655440000';

      await executeTransaction(async (tx) => {
        // Given: 有効なUUID v4
        // When: RLS設定を適用
        await RlsHelper.setCurrentUser(tx, validUserId);

        // Then: 設定値が取得できる
        const result = await tx.execute<{ current_setting: string }>(
          sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
        );
        expect(result[0]?.current_setting).toBe(validUserId);
      });
    });

    test('無効なUUID形式でエラーをスローする', async () => {
      const invalidUserId = 'not-a-valid-uuid';

      // Given: 無効なUUID形式
      // When & Then: エラーがスローされる
      await expect(
        executeTransaction(async (tx) => {
          await RlsHelper.setCurrentUser(tx, invalidUserId);
        }),
      ).rejects.toThrow('Invalid UUID format for user ID');
    });

    test('SQLインジェクション試行を拒否する', async () => {
      const maliciousInput = "'; DROP TABLE tasks; --";

      // Given: SQLインジェクション試行
      // When & Then: UUID検証でエラーがスローされる
      await expect(
        executeTransaction(async (tx) => {
          await RlsHelper.setCurrentUser(tx, maliciousInput);
        }),
      ).rejects.toThrow('Invalid UUID format for user ID');
    });

    test('空文字列でエラーをスローする', async () => {
      const emptyString = '';

      // Given: 空文字列
      // When & Then: エラーがスローされる
      await expect(
        executeTransaction(async (tx) => {
          await RlsHelper.setCurrentUser(tx, emptyString);
        }),
      ).rejects.toThrow('Invalid UUID format for user ID');
    });

    test('UUID v1形式でエラーをスローする', async () => {
      // UUID v1（時刻ベース）は4番目のグループが1で始まる
      const uuidV1 = '123e4567-e89b-11d3-a456-426614174000';

      // Given: UUID v1形式
      // When & Then: UUID v4検証でエラーがスローされる
      await expect(
        executeTransaction(async (tx) => {
          await RlsHelper.setCurrentUser(tx, uuidV1);
        }),
      ).rejects.toThrow('Invalid UUID format for user ID');
    });
  });

  describe('clearCurrentUser', () => {
    test('トランザクション内でRLS設定をクリアする', async () => {
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';

      await executeTransaction(async (tx) => {
        // Given: RLS設定を適用してからクリア
        await RlsHelper.setCurrentUser(tx, testUserId);
        await RlsHelper.clearCurrentUser(tx);

        // When: 設定値を取得
        const result = await tx.execute<{ current_setting: string }>(
          sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
        );

        // Then: 空文字列が取得できる
        expect(result[0]?.current_setting).toBe('');
      });
    });
  });

  describe('複数トランザクションの独立性', () => {
    test('並列トランザクションで独立したRLS設定が適用される', async () => {
      const userId1 = '550e8400-e29b-41d4-a716-446655440002';
      const userId2 = '550e8400-e29b-41d4-a716-446655440003';

      // Given: 2つの独立したトランザクションを並列実行
      const [result1, result2] = await Promise.all([
        executeTransaction(async (tx) => {
          await RlsHelper.setCurrentUser(tx, userId1);
          const result = await tx.execute<{ current_setting: string }>(
            sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
          );
          return result[0]?.current_setting;
        }),
        executeTransaction(async (tx) => {
          await RlsHelper.setCurrentUser(tx, userId2);
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

  describe('エラー時の自動ロールバック', () => {
    test('トランザクション内エラー時にRLS設定が自動的にクリアされる', async () => {
      const testUserId = '550e8400-e29b-41d4-a716-446655440004';
      const errorMessage = 'Intentional error for testing';

      // Given: トランザクション内でエラー発生
      // When & Then: エラーがスローされる
      await expect(
        executeTransaction(async (tx) => {
          await RlsHelper.setCurrentUser(tx, testUserId);
          throw new Error(errorMessage);
        }),
      ).rejects.toThrow(errorMessage);

      // Then: トランザクション外では設定がクリアされている
      const resultOutside = await executeTransaction(async (tx) => {
        const result = await tx.execute<{ current_setting: string }>(
          sql`SELECT current_setting('app.current_user_id', true) as current_setting`,
        );
        return result[0]?.current_setting;
      });
      expect(resultOutside).toBe('');
    });
  });
});
