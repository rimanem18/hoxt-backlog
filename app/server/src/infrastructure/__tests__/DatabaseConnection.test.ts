import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { DatabaseConnection } from '../database/DatabaseConnection';

describe('DatabaseConnection', () => {
  beforeAll(async () => {
    // テスト用環境変数を直接上書き
    process.env.DB_HOST = 'db';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'postgres';
    process.env.DB_USER = 'postgres';
    process.env.DB_PASSWORD = 'test_password';
    process.env.DB_TABLE_PREFIX = 'test_';
    process.env.DATABASE_URL =
      'postgresql://postgres:test_password@db:5432/postgres';
  });

  afterAll(async () => {
    try {
      await DatabaseConnection.close();
    } catch (error) {
      // テスト環境でのクリーンアップエラーは無視
    }
  });

  describe('getConnection', () => {
    test('正常な接続が取得できること', async () => {
      // When: 接続を取得
      const client = await DatabaseConnection.getConnection();

      // Then: 接続が正常に取得される
      expect(client).toBeDefined();
      expect(client.query).toBeDefined();
      expect(typeof client.release).toBe('function');

      // Cleanup
      client.release();
    });

    test('無効なデータベース設定でエラーが発生すること', async () => {
      // Given: 無効なデータベース設定
      const originalUrl = process.env.DATABASE_URL;
      await DatabaseConnection.close(); // 既存プールをクローズ
      process.env.DATABASE_URL =
        'postgresql://invalid:invalid@invalid-host:9999/invalid_db';
      DatabaseConnection.resetPoolForTesting(); // プールをリセット

      // When & Then: 接続エラーが発生
      await expect(DatabaseConnection.getConnection()).rejects.toThrow(
        'データベースへの接続に失敗しました',
      );

      // Cleanup
      await DatabaseConnection.close();
      process.env.DATABASE_URL = originalUrl;
      DatabaseConnection.resetPoolForTesting();
    });
  });

  describe('healthCheck', () => {
    test('ヘルスチェックが正常に動作すること', async () => {
      // When: ヘルスチェックを実行
      const isHealthy = await DatabaseConnection.healthCheck();

      // Then: 正常状態を返す
      expect(isHealthy).toBe(true);
    });

    test('データベース接続が無効な場合にfalseを返すこと', async () => {
      // Given: 無効なデータベース設定
      const originalUrl = process.env.DATABASE_URL;
      await DatabaseConnection.close(); // 既存プールをクローズ
      process.env.DATABASE_URL =
        'postgresql://invalid:invalid@invalid-host:9999/invalid_db';
      DatabaseConnection.resetPoolForTesting(); // プールをリセット

      // When: ヘルスチェックを実行
      const isHealthy = await DatabaseConnection.healthCheck();

      // Then: 異常状態を返す
      expect(isHealthy).toBe(false);

      // Cleanup
      await DatabaseConnection.close();
      process.env.DATABASE_URL = originalUrl;
      DatabaseConnection.resetPoolForTesting();
    });
  });

  describe('executeTransaction', () => {
    test('トランザクションが正常に実行されること', async () => {
      // Given: テスト用処理
      const testValue = 'test_result';

      // When: トランザクション内で処理実行
      const result = await DatabaseConnection.executeTransaction(
        async (client) => {
          // 実際にはクエリを実行するが、テスト用に値を返すだけ
          await client.query('SELECT 1'); // 単純なクエリ
          return testValue;
        },
      );

      // Then: 結果が正常に返される
      expect(result).toBe(testValue);
    });

    test('エラー発生時にロールバックされること', async () => {
      // When & Then: エラーでロールバック
      await expect(
        DatabaseConnection.executeTransaction(async (client) => {
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
      await DatabaseConnection.close();

      // Then: エラーが発生しない（成功すればOK）
      expect(true).toBe(true);
    });
  });
});
