import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { DatabaseConnection } from '../database/DatabaseConnection';

describe('DatabaseConnection', () => {
  beforeAll(async () => {
    // テスト用の環境変数設定
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test_db';
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_password';
    process.env.DB_TABLE_PREFIX = 'test_';
    process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_db';
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
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@invalid-host:9999/invalid_db';

      // When & Then: 接続エラーが発生
      await expect(DatabaseConnection.getConnection())
        .rejects.toThrow('データベースへの接続に失敗しました');

      // Cleanup
      process.env.DATABASE_URL = originalUrl;
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
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@invalid-host:9999/invalid_db';

      // When: ヘルスチェックを実行
      const isHealthy = await DatabaseConnection.healthCheck();

      // Then: 異常状態を返す
      expect(isHealthy).toBe(false);

      // Cleanup
      process.env.DATABASE_URL = originalUrl;
    });
  });

  describe('executeTransaction', () => {
    test('トランザクションが正常に実行されること', async () => {
      // Given: テスト用処理
      const testValue = 'test_result';

      // When: トランザクション内で処理実行
      const result = await DatabaseConnection.executeTransaction(async (client) => {
        // 実際にはクエリを実行するが、テスト用に値を返すだけ
        await client.query('SELECT 1'); // 単純なクエリ
        return testValue;
      });

      // Then: 結果が正常に返される
      expect(result).toBe(testValue);
    });

    test('エラー発生時にロールバックされること', async () => {
      // When & Then: エラーでロールバック
      await expect(DatabaseConnection.executeTransaction(async (client) => {
        await client.query('SELECT 1'); // 正常なクエリ
        throw new Error('テストエラー');
      })).rejects.toThrow('テストエラー');

      // トランザクションのロールバック確認は実装後に詳細テスト
    });
  });

  describe('close', () => {
    test('接続プールが正常に終了すること', async () => {
      // When & Then: エラーが発生しない
      await expect(DatabaseConnection.close()).resolves.not.toThrow();
    });
  });
});