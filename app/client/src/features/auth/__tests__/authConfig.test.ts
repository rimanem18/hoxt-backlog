import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getDemoCredentials } from '@/features/auth/config/authConfig';

describe('getDemoCredentials', () => {
  const originalEmail = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL;
  const originalPassword = process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_DEMO_USER_EMAIL;
    delete process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD;
  });

  afterEach(() => {
    if (originalEmail === undefined) {
      delete process.env.NEXT_PUBLIC_DEMO_USER_EMAIL;
    } else {
      process.env.NEXT_PUBLIC_DEMO_USER_EMAIL = originalEmail;
    }
    if (originalPassword === undefined) {
      delete process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD;
    } else {
      process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD = originalPassword;
    }
  });

  test('email・passwordが両方設定されている場合、資格情報を返す', () => {
    // Given: 両方の環境変数が設定されている
    process.env.NEXT_PUBLIC_DEMO_USER_EMAIL = 'demo@example.com';
    process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD = 'demo_password';

    // When: デモ資格情報を取得
    const result = getDemoCredentials();

    // Then: email・passwordを含むオブジェクトが返る
    expect(result).toEqual({
      email: 'demo@example.com',
      password: 'demo_password',
    });
  });

  test('emailのみ設定されている場合、nullを返す', () => {
    // Given: emailのみ設定されている
    process.env.NEXT_PUBLIC_DEMO_USER_EMAIL = 'demo@example.com';

    // When: デモ資格情報を取得
    const result = getDemoCredentials();

    // Then: nullが返る
    expect(result).toBeNull();
  });

  test('passwordのみ設定されている場合、nullを返す', () => {
    // Given: passwordのみ設定されている
    process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD = 'demo_password';

    // When: デモ資格情報を取得
    const result = getDemoCredentials();

    // Then: nullが返る
    expect(result).toBeNull();
  });

  test('両方とも未設定の場合、nullを返す', () => {
    // Given: 両方の環境変数が未設定

    // When: デモ資格情報を取得
    const result = getDemoCredentials();

    // Then: nullが返る
    expect(result).toBeNull();
  });
});
