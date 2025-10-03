import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

describe('BASE_SCHEMA環境変数検証', () => {
  // 元の環境変数を保存
  const originalBASE_SCHEMA = process.env.BASE_SCHEMA;
  const originalDATABASE_URL = process.env.DATABASE_URL;

  // 各テスト前に環境変数をクリア
  beforeEach(() => {
    delete process.env.BASE_SCHEMA;
    delete process.env.DATABASE_URL;
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

  test('BASE_SCHEMA未設定時にgetBaseSchema()で例外がスローされること', async () => {
    // Given: BASE_SCHEMAが未設定
    // beforeEach でクリア済み

    // When & Then: 動的importでschema.tsを読み込むと例外が発生
    await expect(import(`../database/schema?t=${Date.now()}`)).rejects.toThrow(
      '環境変数設定エラー',
    );
  });

  test('空文字のBASE_SCHEMAでgetBaseSchema()で例外がスローされること', async () => {
    // Given: BASE_SCHEMAが空文字
    process.env.BASE_SCHEMA = '';

    // When & Then: 動的importでschema.tsを読み込むと例外が発生
    await expect(import(`../database/schema?t=${Date.now()}`)).rejects.toThrow(
      '環境変数設定エラー',
    );
  });

  test('有効なBASE_SCHEMAが設定されている場合にschema.tsが正常にロードされること', async () => {
    // Given: 有効なBASE_SCHEMA
    process.env.BASE_SCHEMA = 'test_schema';

    // When: schema.tsを動的にimport
    const schemaModule = await import(`../database/schema?t=${Date.now()}`);

    // Then: getBaseSchema関数が存在し、正しい値を返す
    expect(schemaModule.getBaseSchema).toBeDefined();
    expect(schemaModule.getBaseSchema()).toBe('test_schema');
  });

  test('DATABASE_URLが未設定でもBASE_SCHEMAが設定されていれば正常に動作すること', async () => {
    // Given: BASE_SCHEMAのみ設定、DATABASE_URL未設定
    process.env.BASE_SCHEMA = 'production_schema';
    delete process.env.DATABASE_URL;

    // When: schema.tsを動的にimport
    const schemaModule = await import(`../database/schema?t=${Date.now()}`);

    // Then: 正常にロードされる（drizzle-kit対応）
    expect(schemaModule.getBaseSchema()).toBe('production_schema');
  });
});
