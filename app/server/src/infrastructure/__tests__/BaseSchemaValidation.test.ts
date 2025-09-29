import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getBaseSchema } from '../database/schema';

describe('BASE_SCHEMA環境変数検証', () => {
  // 元の環境変数を保存
  const originalBASE_SCHEMA = process.env.BASE_SCHEMA;
  const originalDATABASE_URL = process.env.DATABASE_URL;

  // 各テスト前に環境変数をクリア
  beforeEach(() => {
    delete process.env.BASE_SCHEMA;
  });

  // テスト後に元の環境変数を復元
  afterEach(() => {
    if (originalBASE_SCHEMA) {
      process.env.BASE_SCHEMA = originalBASE_SCHEMA;
    } else {
      delete process.env.BASE_SCHEMA;
    }

    if (originalDATABASE_URL) {
      process.env.DATABASE_URL = originalDATABASE_URL;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  test('BASE_SCHEMA未設定時にgetBaseSchema()で例外がスローされること', () => {
    // Given: BASE_SCHEMAが未設定
    // beforeEach でクリア済み

    // When & Then: getBaseSchema()で例外が発生
    expect(() => {
      getBaseSchema();
    }).toThrow('環境変数設定エラー');
  });

  test('空文字のBASE_SCHEMAでgetBaseSchema()で例外がスローされること', () => {
    // Given: BASE_SCHEMAが空文字
    process.env.BASE_SCHEMA = '';

    // When & Then: getBaseSchema()で例外が発生
    expect(() => {
      getBaseSchema();
    }).toThrow('環境変数設定エラー');
  });

  test('有効なBASE_SCHEMAが設定されている場合にgetBaseSchema()が正常に値を返すこと', () => {
    // Given: 有効なBASE_SCHEMA
    process.env.BASE_SCHEMA = 'test_schema';

    // When: getBaseSchema()を実行
    const result = getBaseSchema();

    // Then: 正しい値が返される
    expect(result).toBe('test_schema');
  });

  test('DATABASE_URLが未設定でもBASE_SCHEMAが設定されていれば正常に動作すること', () => {
    // Given: BASE_SCHEMAのみ設定、DATABASE_URL未設定
    process.env.BASE_SCHEMA = 'production_schema';
    delete process.env.DATABASE_URL;

    // When: getBaseSchema()を実行
    const result = getBaseSchema();

    // Then: 正しい値が返される（drizzle-kit対応）
    expect(result).toBe('production_schema');
  });
});
