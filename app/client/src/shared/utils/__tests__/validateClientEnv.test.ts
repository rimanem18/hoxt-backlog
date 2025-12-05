import { describe, expect, test } from 'bun:test';
import { validateClientEnv } from '@/shared/utils/validateClientEnv';

describe('validateClientEnv', () => {
  test('すべての必須環境変数が設定されている場合、エラーが発生しない', () => {
    // Given: すべての必須環境変数が設定されている
    const testEnv = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      NEXT_PUBLIC_SITE_URL: 'https://example.com',
    };

    // When & Then: 検証が成功する
    expect(() =>
      validateClientEnv({
        env: testEnv,
        nodeEnv: 'production',
      }),
    ).not.toThrow();
  });

  test('NEXT_PUBLIC_SUPABASE_URLが未設定の場合、console.errorが呼ばれる', () => {
    // Given: NEXT_PUBLIC_SUPABASE_URLが未設定
    const testEnv = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      NEXT_PUBLIC_SITE_URL: 'https://example.com',
    };

    // モックを設定
    let errorMessage = '';
    const mockLogger = (msg: string) => {
      errorMessage = msg;
    };

    // When: 検証を実行
    validateClientEnv({
      env: testEnv,
      nodeEnv: 'production',
      logger: mockLogger,
    });

    // Then: エラーメッセージにNEXT_PUBLIC_SUPABASE_URLが含まれる
    expect(errorMessage).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  test('複数の環境変数が未設定の場合、すべてのエラーが報告される', () => {
    // Given: 複数の環境変数が未設定
    const testEnv = {
      NEXT_PUBLIC_SITE_URL: 'https://example.com',
    };

    // モックを設定
    let errorMessage = '';
    const mockLogger = (msg: string) => {
      errorMessage = msg;
    };

    // When: 検証を実行
    validateClientEnv({
      env: testEnv,
      nodeEnv: 'production',
      logger: mockLogger,
    });

    // Then: すべての未設定項目がエラーメッセージに含まれる
    expect(errorMessage).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(errorMessage).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  test('空文字列の環境変数は未設定として扱われる', () => {
    // Given: 環境変数が空文字列
    const testEnv = {
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      NEXT_PUBLIC_SITE_URL: 'https://example.com',
    };

    // モックを設定
    let errorMessage = '';
    const mockLogger = (msg: string) => {
      errorMessage = msg;
    };

    // When: 検証を実行
    validateClientEnv({
      env: testEnv,
      nodeEnv: 'production',
      logger: mockLogger,
    });

    // Then: エラーメッセージにNEXT_PUBLIC_SUPABASE_URLが含まれる
    expect(errorMessage).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  test('テスト環境ではconsole.errorが呼ばれない', () => {
    // Given: テスト環境かつ環境変数が未設定
    const testEnv = {};

    // モックを設定
    let errorCalled = false;
    const mockLogger = () => {
      errorCalled = true;
    };

    // When: 検証を実行
    validateClientEnv({
      env: testEnv,
      nodeEnv: 'test',
      logger: mockLogger,
    });

    // Then: console.errorが呼ばれない
    expect(errorCalled).toBe(false);
  });

  test('引数なし呼び出しでデフォルト動作が保証される（回帰テスト）', () => {
    // Given: 引数なしで呼び出し
    // When & Then: エラーが発生しない（デフォルトでテスト環境をスキップ）
    expect(() => validateClientEnv()).not.toThrow();
  });
});
