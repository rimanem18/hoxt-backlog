/**
 * normalizeDomain 関数のテスト
 * ドメイン正規化ロジックの検証
 */

import { describe, expect, it } from 'bun:test';
import { normalizeDomain } from '../services/providers/googleAuthProvider';

/**
 * normalizeDomain 関数のテスト
 * 環境変数から取得したドメイン文字列を正規化する
 */
describe('normalizeDomain', () => {
  it('httpsプロトコルを削除する', () => {
    // Given: httpsプロトコル付きドメイン
    const input = 'https://example.com';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: プロトコルが削除される
    expect(result).toBe('example.com');
  });

  it('httpプロトコルを削除する', () => {
    // Given: httpプロトコル付きドメイン
    const input = 'http://example.com';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: プロトコルが削除される
    expect(result).toBe('example.com');
  });

  it('www. プレフィックスを削除する', () => {
    // Given: www付きドメイン
    const input = 'www.example.com';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: wwwが削除される
    expect(result).toBe('example.com');
  });

  it('前後の空白を除去する', () => {
    // Given: 前後に空白があるドメイン
    const input = '  example.com  ';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: 空白が除去される
    expect(result).toBe('example.com');
  });

  it('末尾のスラッシュを削除する', () => {
    // Given: 末尾にスラッシュがあるドメイン
    const input = 'example.com/';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: スラッシュが削除される
    expect(result).toBe('example.com');
  });

  it('小文字に変換する', () => {
    // Given: 大文字を含むドメイン
    const input = 'Example.COM';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: すべて小文字になる
    expect(result).toBe('example.com');
  });

  it('複合的な正規化処理を実行する', () => {
    // Given: プロトコル、www、空白、スラッシュ、大文字を含む
    const input = '  https://www.Example.com/  ';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: すべて正規化される
    expect(result).toBe('example.com');
  });

  it('localhost:3000 をそのまま保持する', () => {
    // Given: ポート付きlocalhost
    const input = 'localhost:3000';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: ポート付きのまま返される
    expect(result).toBe('localhost:3000');
  });

  it('サブドメインを保持する', () => {
    // Given: サブドメイン付きドメイン
    const input = 'https://api.example.com';

    // When: normalizeDomain を呼び出す
    const result = normalizeDomain(input);

    // Then: サブドメインが保持される
    expect(result).toBe('api.example.com');
  });
});
