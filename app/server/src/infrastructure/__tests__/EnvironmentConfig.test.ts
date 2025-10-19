import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getDatabaseConfig, validateConfig } from '../config/env';

describe('EnvironmentConfig', () => {
  // 環境変数の元の値を保存
  let originalBaseSchema: string | undefined;
  let originalDatabaseUrl: string | undefined;

  // 各テスト前に環境変数を保存してからクリア
  beforeEach(() => {
    originalBaseSchema = process.env.BASE_SCHEMA;
    originalDatabaseUrl = process.env.DATABASE_URL;

    delete process.env.BASE_SCHEMA;
    delete process.env.DATABASE_URL;
  });

  // 各テスト後に環境変数を復元（他のテストへの副作用を防ぐ）
  afterEach(() => {
    if (originalBaseSchema !== undefined) {
      process.env.BASE_SCHEMA = originalBaseSchema;
    }
    if (originalDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  describe('getDatabaseConfig', () => {
    test('正常なデータベース設定が取得できること', () => {
      // Given: 有効な環境変数設定
      process.env.BASE_SCHEMA = 'test_schema';
      process.env.DATABASE_URL =
        'postgresql://test_user:test_password@localhost:5432/test_db';

      // When: 設定を取得
      const config = getDatabaseConfig();

      // Then: 設定値が正しい
      expect(config.schema).toBe('test_schema');
      expect(config.url).toBe(
        'postgresql://test_user:test_password@localhost:5432/test_db',
      );
    });

    test('必須環境変数が不足している場合にエラーが発生すること - DATABASE_URL', () => {
      // Given: DATABASE_URLが不足
      process.env.BASE_SCHEMA = 'test_schema';

      // When & Then: 設定エラーが発生
      expect(() => getDatabaseConfig()).toThrow('環境変数設定エラー');
    });

    test('必須環境変数が不足している場合にエラーが発生すること - BASE_SCHEMA', () => {
      // Given: BASE_SCHEMAが不足
      process.env.DATABASE_URL =
        'postgresql://test_user:test_password@localhost:5432/test_db';

      // When & Then: 設定エラーが発生
      expect(() => getDatabaseConfig()).toThrow('環境変数設定エラー');
    });
  });

  describe('validateConfig', () => {
    test('有効な設定で検証が通過すること', () => {
      // Given: 有効な環境変数設定
      process.env.BASE_SCHEMA = 'test_schema';
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
