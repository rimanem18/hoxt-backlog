import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getVapidPublicKey } from '../env';

describe('getVapidPublicKey', () => {
  const originalValue = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    } else {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalValue;
    }
  });

  test('環境変数が設定されている場合はその値を返す', () => {
    // Given: VAPID公開鍵が設定されている
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-public-key';

    // When: 公開鍵を取得
    const result = getVapidPublicKey();

    // Then: 設定値がそのまま返る
    expect(result).toBe('test-vapid-public-key');
  });

  test('環境変数が未設定の場合はエラーを投げる', () => {
    // Given: VAPID公開鍵が未設定

    // When & Then: 明確なエラーメッセージで例外が発生する
    expect(() => getVapidPublicKey()).toThrow(
      'NEXT_PUBLIC_VAPID_PUBLIC_KEY環境変数が設定されていません',
    );
  });
});
