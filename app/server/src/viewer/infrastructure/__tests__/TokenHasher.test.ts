import { describe, expect, test } from 'bun:test';
import { TokenHasher } from '../TokenHasher';

describe('TokenHasher', () => {
  describe('generate', () => {
    test('呼び出すたびに異なる値を返す', () => {
      // Given: TokenHasherインスタンス
      const hasher = new TokenHasher();

      // When: 2回トークンを生成
      const first = hasher.generate();
      const second = hasher.generate();

      // Then: 異なる値が返る
      expect(first).not.toBe(second);
    });

    test('32バイト分の16進数文字列（64文字）を返す', () => {
      // Given: TokenHasherインスタンス
      const hasher = new TokenHasher();

      // When: トークンを生成
      const token = hasher.generate();

      // Then: 64文字の16進数文字列
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('hash', () => {
    test('同一入力に対して常に同一のハッシュ値を返す（決定性）', () => {
      // Given: TokenHasherインスタンスと固定の生トークン
      const hasher = new TokenHasher();
      const rawToken = 'fixed-raw-token-value';

      // When: 同じ入力を2回ハッシュ化
      const first = hasher.hash(rawToken);
      const second = hasher.hash(rawToken);

      // Then: 同じハッシュ値が返る
      expect(first).toBe(second);
    });

    test('異なる入力に対して異なるハッシュ値を返す', () => {
      // Given: TokenHasherインスタンスと異なる2つの生トークン
      const hasher = new TokenHasher();

      // When: それぞれをハッシュ化
      const first = hasher.hash('raw-token-a');
      const second = hasher.hash('raw-token-b');

      // Then: 異なるハッシュ値が返る
      expect(first).not.toBe(second);
    });

    test('SHA-256の16進数文字列（64文字）を返す', () => {
      // Given: TokenHasherインスタンス
      const hasher = new TokenHasher();

      // When: ハッシュ化
      const hash = hasher.hash('raw-token-value');

      // Then: 64文字の16進数文字列
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
