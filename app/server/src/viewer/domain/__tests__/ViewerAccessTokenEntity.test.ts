import { describe, expect, test } from 'bun:test';
import { ViewerAccessTokenEntity } from '../ViewerAccessTokenEntity';

describe('ViewerAccessTokenEntity', () => {
  describe('create', () => {
    test('tokenHashとexpiresAtが保持される', () => {
      // Given: 新規発行に必要な入力
      const expiresAt = new Date('2026-09-01T00:00:00.000Z');

      // When: 新規トークンを生成
      const token = ViewerAccessTokenEntity.create({
        email: 'viewer@example.com',
        rawToken: 'raw-token-value',
        tokenHash: 'hashed-value',
        expiresAt,
      });

      // Then: tokenHashとexpiresAtが保持される
      expect(token.getTokenHash()).toBe('hashed-value');
      expect(token.getExpiresAt()).toEqual(expiresAt);
    });

    test('emailが正規化（trim + 小文字化）されて保持される', () => {
      // Given: 前後空白と大文字を含むemail
      const email = '  Viewer@Example.COM  ';

      // When: 新規トークンを生成
      const token = ViewerAccessTokenEntity.create({
        email,
        rawToken: 'raw-token-value',
        tokenHash: 'hashed-value',
        expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      });

      // Then: 正規化された値が保持される
      expect(token.getEmail()).toBe('viewer@example.com');
    });

    test('生成時に渡した生トークンをgetRawToken()で取得できる', () => {
      // Given: 新規発行に必要な入力
      const rawToken = 'raw-token-value';

      // When: 新規トークンを生成
      const token = ViewerAccessTokenEntity.create({
        email: 'viewer@example.com',
        rawToken,
        tokenHash: 'hashed-value',
        expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      });

      // Then: 生成時に渡した生トークンが取得できる
      expect(token.getRawToken()).toBe(rawToken);
    });
  });

  describe('reconstruct', () => {
    test('永続化データから復元した場合getRawToken()はnullを返す', () => {
      // Given: 永続化済みのプロパティ（生トークンは含まない）
      const props = {
        id: 'token-1',
        email: 'viewer@example.com',
        tokenHash: 'hashed-value',
        expiresAt: new Date('2026-09-01T00:00:00.000Z'),
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      // When: エンティティを復元
      const token = ViewerAccessTokenEntity.reconstruct(props);

      // Then: 生トークンは保持されていない
      expect(token.getRawToken()).toBeNull();
      expect(token.getTokenHash()).toBe('hashed-value');
    });
  });

  describe('isExpired', () => {
    test('有効期限ちょうどの時刻はfalseを返す（30日ちょうどは有効）', () => {
      // Given: 有効期限がちょうど現在時刻と一致するトークン
      const expiresAt = new Date('2026-08-31T00:00:00.000Z');
      const token = ViewerAccessTokenEntity.reconstruct({
        id: 'token-1',
        email: 'viewer@example.com',
        tokenHash: 'hashed-value',
        expiresAt,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      });

      // When: 有効期限ちょうどの時刻で判定
      const result = token.isExpired(expiresAt);

      // Then: 有効（falseを返す）
      expect(result).toBe(false);
    });

    test('有効期限を1ミリ秒でも超過するとtrueを返す', () => {
      // Given: 有効期限を1ミリ秒超過した時刻
      const expiresAt = new Date('2026-08-31T00:00:00.000Z');
      const token = ViewerAccessTokenEntity.reconstruct({
        id: 'token-1',
        email: 'viewer@example.com',
        tokenHash: 'hashed-value',
        expiresAt,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      });
      const now = new Date(expiresAt.getTime() + 1);

      // When: 超過後の時刻で判定
      const result = token.isExpired(now);

      // Then: 無効（trueを返す）
      expect(result).toBe(true);
    });

    test('有効期限より前の時刻はfalseを返す', () => {
      // Given: 有効期限より前の時刻
      const expiresAt = new Date('2026-08-31T00:00:00.000Z');
      const token = ViewerAccessTokenEntity.reconstruct({
        id: 'token-1',
        email: 'viewer@example.com',
        tokenHash: 'hashed-value',
        expiresAt,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      });
      const now = new Date(expiresAt.getTime() - 1);

      // When: 期限前の時刻で判定
      const result = token.isExpired(now);

      // Then: 有効（falseを返す）
      expect(result).toBe(false);
    });
  });
});
