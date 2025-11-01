import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { validateClientEnv } from '@/shared/utils/validateClientEnv';

describe('validateClientEnv', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: ReturnType<typeof console.error>;

  beforeEach(() => {
    // 環境変数のスナップショットを保存
    originalEnv = { ...process.env };

    // console.errorをスパイ
    consoleErrorSpy = console.error;
    console.error = () => {};
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;

    // console.errorを復元
    console.error = consoleErrorSpy;
  });

  test('すべての必須環境変数が設定されている場合、エラーが発生しない', () => {
    // Given: すべての必須環境変数が設定されている
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    process.env.NODE_ENV = 'production';

    // When & Then: 検証が成功する
    expect(() => validateClientEnv()).not.toThrow();
  });

  test('NEXT_PUBLIC_SUPABASE_URLが未設定の場合、console.errorが呼ばれる', () => {
    // Given: NEXT_PUBLIC_SUPABASE_URLが未設定
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    process.env.NODE_ENV = 'production';

    // モックを設定
    let errorMessage = '';
    console.error = (msg: string) => {
      errorMessage = msg;
    };

    // When: 検証を実行
    validateClientEnv();

    // Then: エラーメッセージにNEXT_PUBLIC_SUPABASE_URLが含まれる
    expect(errorMessage).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  test('複数の環境変数が未設定の場合、すべてのエラーが報告される', () => {
    // Given: 複数の環境変数が未設定
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    process.env.NODE_ENV = 'production';

    // モックを設定
    let errorMessage = '';
    console.error = (msg: string) => {
      errorMessage = msg;
    };

    // When: 検証を実行
    validateClientEnv();

    // Then: すべての未設定項目がエラーメッセージに含まれる
    expect(errorMessage).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(errorMessage).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  test('空文字列の環境変数は未設定として扱われる', () => {
    // Given: 環境変数が空文字列
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    process.env.NODE_ENV = 'production';

    // モックを設定
    let errorMessage = '';
    console.error = (msg: string) => {
      errorMessage = msg;
    };

    // When: 検証を実行
    validateClientEnv();

    // Then: エラーメッセージにNEXT_PUBLIC_SUPABASE_URLが含まれる
    expect(errorMessage).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  test('テスト環境ではconsole.errorが呼ばれない', () => {
    // Given: テスト環境かつ環境変数が未設定
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NODE_ENV = 'test';

    // モックを設定
    let errorCalled = false;
    console.error = () => {
      errorCalled = true;
    };

    // When: 検証を実行
    validateClientEnv();

    // Then: console.errorが呼ばれない
    expect(errorCalled).toBe(false);
  });
});
