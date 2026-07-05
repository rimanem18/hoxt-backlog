import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseEmailSignupGateway } from '../SupabaseEmailSignupGateway';

// ─── テスト用ヘルパー ───────────────────────────────────────────────────────

function makeFakeClient(
  signUpImpl: (args: {
    email: string;
    password: string;
  }) => Promise<{ data: { user: { id: string } | null }; error: Error | null }>,
): SupabaseClient {
  return {
    auth: {
      signUp: mock(signUpImpl),
    },
  } as unknown as SupabaseClient;
}

// ─── テストスイート ────────────────────────────────────────────────────────

describe('SupabaseEmailSignupGateway', () => {
  afterEach(() => {
    mock.restore();
  });

  test('signUp が成功した場合、userId を返す', async () => {
    // Given: signUp が user.id を含むレスポンスを返す
    const client = makeFakeClient(() =>
      Promise.resolve({ data: { user: { id: 'new-user-id' } }, error: null }),
    );
    const gateway = SupabaseEmailSignupGateway.createForTesting(client);

    // When: signUp を実行
    const result = await gateway.signUp('user@example.com', 'Password1!');

    // Then: userId が返り error は null
    expect(result).toEqual({ userId: 'new-user-id', error: null });
  });

  test('Supabase が AuthError を返した場合、error をそのまま返す', async () => {
    // Given: signUp がエラーを返す
    const authError = new Error('User already registered');
    const client = makeFakeClient(() =>
      Promise.resolve({ data: { user: null }, error: authError }),
    );
    const gateway = SupabaseEmailSignupGateway.createForTesting(client);

    // When: signUp を実行
    const result = await gateway.signUp('user@example.com', 'Password1!');

    // Then: userId は null、error は Supabase のエラー
    expect(result).toEqual({ userId: null, error: authError });
  });

  test('signUp が例外を throw した場合、Error に正規化して返す', async () => {
    // Given: signUp がネットワーク例外を throw する
    const client = makeFakeClient(() => {
      throw new Error('network error');
    });
    const gateway = SupabaseEmailSignupGateway.createForTesting(client);

    // When: signUp を実行
    const result = await gateway.signUp('user@example.com', 'Password1!');

    // Then: userId は null、error は正規化済みの Error
    expect(result.userId).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('network error');
  });

  test('createForTesting はテスト環境以外では使用できない', () => {
    // Given: NODE_ENV をテスト以外に変更
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const client = makeFakeClient(() =>
      Promise.resolve({ data: { user: null }, error: null }),
    );

    try {
      // When & Then: createForTesting が例外を throw する
      expect(() => SupabaseEmailSignupGateway.createForTesting(client)).toThrow(
        'createForTesting is only available in test environment',
      );
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnv;
      }
    }
  });
});
