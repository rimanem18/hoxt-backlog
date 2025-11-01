/**
 * authValidation.ts のテスト
 * getSupabaseStorageKey 関数の動的キー生成ロジックを検証
 */

import { afterEach, describe, expect, it } from 'bun:test';
import { getSupabaseStorageKey } from '../authValidation';

/**
 * getSupabaseStorageKey 関数のテスト
 * 環境に応じたSupabaseストレージキーの動的生成を検証
 */
describe('getSupabaseStorageKey', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    // テスト後に環境変数を復元
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
    }
  });

  it('環境変数未設定時はlocalhostキーを返す', () => {
    // Given: 環境変数が未設定
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: localhost用のキーが返される
    expect(result).toBe('sb-localhost-auth-token');
  });

  it('.supabase.co ドメインからプロジェクトIDを抽出する', () => {
    // Given: .supabase.co ドメインのURL
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://hesdfwaeyiucopfzstgi.supabase.co';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: プロジェクトIDを含むキーが返される
    expect(result).toBe('sb-hesdfwaeyiucopfzstgi-auth-token');
  });

  it('.supabase.net ドメインからプロジェクトIDを抽出する', () => {
    // Given: .supabase.net ドメインのURL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.net';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: プロジェクトIDを含むキーが返される
    expect(result).toBe('sb-myproject-auth-token');
  });

  it('カスタムドメインからプロジェクトIDを抽出する', () => {
    // Given: カスタムドメインのURL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.example.com';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: サブドメインを含むキーが返される
    expect(result).toBe('sb-custom-auth-token');
  });

  it('空文字列の環境変数に対してlocalhost キーを返す', () => {
    // Given: 空文字列の環境変数
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: localhost用のキーが返される
    expect(result).toBe('sb-localhost-auth-token');
  });

  it('https以外のプロトコルに対してlocalhost キーを返す', () => {
    // Given: http プロトコルのURL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://insecure.supabase.co';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: localhost用のキーが返される（セキュリティ考慮）
    expect(result).toBe('sb-localhost-auth-token');
  });
});
