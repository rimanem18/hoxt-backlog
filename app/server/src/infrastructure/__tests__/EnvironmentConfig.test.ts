import { beforeEach, describe, expect, test } from 'bun:test';
import { getDatabaseConfig, validateConfig } from '../config/env';

describe('EnvironmentConfig', () => {
  // 各テスト前に環境変数をクリア
  beforeEach(() => {
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_TABLE_PREFIX;
    delete process.env.DATABASE_URL;
  });

  describe('getDatabaseConfig', () => {
    test('正常なデータベース設定が取得できること', () => {
      // Given: 有効な環境変数設定
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.DB_TABLE_PREFIX = 'test_';
      process.env.DATABASE_URL =
        'postgresql://test_user:test_password@localhost:5432/test_db';

      // When: 設定を取得
      const config = getDatabaseConfig();

      // Then: 設定値が正しい
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('test_db');
      expect(config.username).toBe('test_user');
      expect(config.password).toBe('test_password');
      expect(config.tablePrefix).toBe('test_');
      expect(config.url).toBe(
        'postgresql://test_user:test_password@localhost:5432/test_db',
      );
    });

    test('必須環境変数が不足している場合にエラーが発生すること - DB_HOST', () => {
      // Given: DB_HOSTが不足
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.DB_TABLE_PREFIX = 'test_';

      // When & Then: 設定エラーが発生
      expect(() => getDatabaseConfig()).toThrow('環境変数設定エラー');
    });

    test('必須環境変数が不足している場合にエラーが発生すること - DB_PORT', () => {
      // Given: DB_PORTが不足
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.DB_TABLE_PREFIX = 'test_';

      // When & Then: 設定エラーが発生
      expect(() => getDatabaseConfig()).toThrow('環境変数設定エラー');
    });

    test('不正なポート番号でエラーが発生すること', () => {
      // Given: 不正なポート番号
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = 'invalid_port';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.DB_TABLE_PREFIX = 'test_';

      // When & Then: 設定エラーが発生
      expect(() => getDatabaseConfig()).toThrow('環境変数設定エラー');
    });
  });

  describe('validateConfig', () => {
    test('有効な設定で検証が通過すること', () => {
      // Given: 有効な環境変数設定
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.DB_TABLE_PREFIX = 'test_';
      process.env.DATABASE_URL =
        'postgresql://test_user:test_password@localhost:5432/test_db';

      // When & Then: エラーが発生しない
      expect(() => validateConfig()).not.toThrow();
    });

    test('設定が不足している場合に詳細なエラーが発生すること', () => {
      // Given: 不完全な設定
      // 環境変数を設定しない

      // When & Then: 詳細なエラーが発生
      expect(() => validateConfig()).toThrow('環境変数設定エラー');
    });
  });
});
