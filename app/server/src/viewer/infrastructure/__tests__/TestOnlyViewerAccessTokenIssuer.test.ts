import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import type { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import { TestOnlyViewerAccessTokenIssuer } from '../TestOnlyViewerAccessTokenIssuer';
import { TokenHasher } from '../TokenHasher';

function createInMemoryTokenRepository(): IViewerAccessTokenRepository & {
  saved: ViewerAccessTokenEntity[];
} {
  const saved: ViewerAccessTokenEntity[] = [];
  return {
    saved,
    async findByEmail() {
      return null;
    },
    async findByTokenHash() {
      return null;
    },
    async save(entity: ViewerAccessTokenEntity) {
      saved.push(entity);
      return entity;
    },
    async deleteById() {},
    async replace(_existingId, _newTokenHash, _newExpiresAt) {
      throw new Error('replace is not supported in this fake');
    },
  };
}

describe('TestOnlyViewerAccessTokenIssuer', () => {
  const originalEnvironment = process.env.ENVIRONMENT;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnableFlag = process.env.ENABLE_TEST_ENDPOINTS;

  beforeEach(() => {
    process.env.ENVIRONMENT = 'development';
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_ENDPOINTS = 'true';
  });

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.ENVIRONMENT;
    } else {
      process.env.ENVIRONMENT = originalEnvironment;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalEnableFlag === undefined) {
      delete process.env.ENABLE_TEST_ENDPOINTS;
    } else {
      process.env.ENABLE_TEST_ENDPOINTS = originalEnableFlag;
    }
  });

  test('指定したexpiresAtでトークンを発行し永続化する', async () => {
    // Given: テスト専用ガードが有効な状態
    const repository = createInMemoryTokenRepository();
    const issuer = new TestOnlyViewerAccessTokenIssuer(
      repository,
      new TokenHasher(),
    );
    const expiresAt = new Date('2020-01-01T00:00:00.000Z');

    // When: 過去日時を指定してトークンを発行
    const result = await issuer.issue('viewer@example.com', expiresAt);

    // Then: 生トークンが返り、指定した有効期限で永続化される
    expect(result.rawToken).toHaveLength(64);
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]?.getExpiresAt()).toEqual(expiresAt);
    expect(repository.saved[0]?.getEmail()).toBe('viewer@example.com');
  });

  test('ENABLE_TEST_ENDPOINTSが無効な場合は例外になる', async () => {
    // Given: テスト専用ガードが無効な状態
    process.env.ENABLE_TEST_ENDPOINTS = 'false';
    const repository = createInMemoryTokenRepository();
    const issuer = new TestOnlyViewerAccessTokenIssuer(
      repository,
      new TokenHasher(),
    );

    // When & Then: 発行が例外になる
    await expect(
      issuer.issue('viewer@example.com', new Date()),
    ).rejects.toThrow();
    expect(repository.saved).toHaveLength(0);
  });

  test('ENVIRONMENTがproductionの場合は例外になる', async () => {
    // Given: 本番相当の環境変数
    process.env.ENVIRONMENT = 'production';
    const repository = createInMemoryTokenRepository();
    const issuer = new TestOnlyViewerAccessTokenIssuer(
      repository,
      new TokenHasher(),
    );

    // When & Then: 発行が例外になる
    await expect(
      issuer.issue('viewer@example.com', new Date()),
    ).rejects.toThrow();
  });

  test('ENVIRONMENTが許可リスト外の未知の値（未設定・タイプミス想定）の場合は例外になる', async () => {
    // Given: 許可リストに含まれない値（未設定・タイプミス相当）
    delete process.env.ENVIRONMENT;
    const repository = createInMemoryTokenRepository();
    const issuer = new TestOnlyViewerAccessTokenIssuer(
      repository,
      new TokenHasher(),
    );

    // When & Then: 発行が例外になる（fail-closed）
    await expect(
      issuer.issue('viewer@example.com', new Date()),
    ).rejects.toThrow();
  });

  test('ENVIRONMENTが許可リストに含まれていてもNODE_ENVがproductionの場合は例外になる（preview相当の多層防御）', async () => {
    // Given: ENVIRONMENT=previewだがNODE_ENVがproductionに揃えられた状態
    process.env.ENVIRONMENT = 'preview';
    process.env.NODE_ENV = 'production';
    const repository = createInMemoryTokenRepository();
    const issuer = new TestOnlyViewerAccessTokenIssuer(
      repository,
      new TokenHasher(),
    );

    // When & Then: 発行が例外になる
    await expect(
      issuer.issue('viewer@example.com', new Date()),
    ).rejects.toThrow();
    expect(repository.saved).toHaveLength(0);
  });
});
