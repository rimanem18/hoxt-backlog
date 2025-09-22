import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
  closePool,
  executeTransaction,
  getConnection,
  healthCheck,
  resetPoolForTesting,
} from '../database/connection';

describe('DatabaseConnection', () => {
  beforeAll(async () => {
    // テスト用環境変数を設定
    process.env.BASE_SCHEMA = process.env.BASE_SCHEMA || 'app_test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://postgres:test_password@db:5432/postgres';
  });

  afterAll(async () => {
    try {
      await closePool();
    } catch (_error) {
      // テスト環境でのクリーンアップエラーは無視
    }
  });

  describe('getConnection', () => {
    test('正常な接続が取得できること', async () => {
      // When: 接続を取得
      const client = await getConnection();

      // Then: 接続が正常に取得される
      expect(client).toBeDefined();
      expect(client.query).toBeDefined();
      expect(typeof client.release).toBe('function');

      // Cleanup
      client.release();
    });

    test('無効なデータベース設定でエラーが発生すること', async () => {
      // Given: 無効なデータベース設定（ローカルホストで無効なポート）
      const originalUrl = process.env.DATABASE_URL;
      await closePool(); // 既存プールをクローズ
      process.env.DATABASE_URL =
        'postgresql://invalid:invalid@localhost:9999/invalid_db';
      resetPoolForTesting(); // プールをリセット

      // When & Then: 接続エラーが発生
      await expect(getConnection()).rejects.toThrow(
        'データベースへの接続に失敗しました',
      );

      // Cleanup
      await closePool();
      process.env.DATABASE_URL = originalUrl;
      resetPoolForTesting();
    });
  });

  describe('healthCheck', () => {
    test('ヘルスチェックが正常に動作すること', async () => {
      // When: ヘルスチェックを実行
      const isHealthy = await healthCheck();

      // Then: 正常状態を返す
      expect(isHealthy).toBe(true);
    });

    test('データベース接続が無効な場合にfalseを返すこと', async () => {
      // Given: 無効なデータベース設定（ローカルホストで無効なポート）
      const originalUrl = process.env.DATABASE_URL;
      await closePool(); // 既存プールをクローズ
      process.env.DATABASE_URL =
        'postgresql://invalid:invalid@localhost:9999/invalid_db';
      resetPoolForTesting(); // プールをリセット

      // When: ヘルスチェックを実行
      const isHealthy = await healthCheck();

      // Then: 異常状態を返す
      expect(isHealthy).toBe(false);

      // Cleanup
      await closePool();
      process.env.DATABASE_URL = originalUrl;
      resetPoolForTesting();
    });
  });

  describe('executeTransaction', () => {
    test('トランザクションが正常に実行されること', async () => {
      // Given: テスト用処理
      const testValue = 'test_result';

      // When: トランザクション内で処理実行
      const result = await executeTransaction(async (client) => {
        // 実際にはクエリを実行するが、テスト用に値を返すだけ
        await client.query('SELECT 1'); // 単純なクエリ
        return testValue;
      });

      // Then: 結果が正常に返される
      expect(result).toBe(testValue);
    });

    test('エラー発生時にロールバックされること', async () => {
      // When & Then: エラーでロールバック
      await expect(
        executeTransaction(async (client) => {
          await client.query('SELECT 1'); // 正常なクエリ
          throw new Error('テストエラー');
        }),
      ).rejects.toThrow('テストエラー');

      // トランザクションのロールバック確認は実装後に詳細テスト
    });
  });

  describe('close', () => {
    test('接続プールが正常に終了すること', async () => {
      // When: プールを終了
      await closePool();

      // Then: エラーが発生しない（成功すればOK）
      expect(true).toBe(true);
    });
  });
});
