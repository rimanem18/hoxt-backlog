/**
 * viewerTokenMiddleware のユニットテスト
 *
 * Viewer-Access-Tokenヘッダの検証とContextへのviewerEmailセットを検証する
 */

import { describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import { InvalidViewerAccessTokenError } from '@/viewer/domain/errors';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import type { TokenHasher } from '@/viewer/infrastructure/TokenHasher';
import { viewerTokenMiddleware } from '../viewerTokenMiddleware';

function buildApp(
  viewerAccessTokenRepository: IViewerAccessTokenRepository,
  tokenHasher: TokenHasher,
) {
  const app = new Hono();
  app.use(
    '*',
    viewerTokenMiddleware({ viewerAccessTokenRepository, tokenHasher }),
  );
  app.get('/test', (c) =>
    c.json({
      viewerEmail: c.get('viewerEmail'),
      tokenExpiresAt: c.get('viewerTokenExpiresAt'),
    }),
  );
  app.onError((err, c) => {
    if (err instanceof InvalidViewerAccessTokenError) {
      return c.json({ success: false, error: { code: err.code } }, 401);
    }
    return c.json({ success: false, error: { message: err.message } }, 500);
  });
  return app;
}

function createStubTokenHasher(hashResult: string): TokenHasher {
  return {
    generate: mock(() => 'unused'),
    hash: mock(() => hashResult),
  };
}

describe('viewerTokenMiddleware', () => {
  test('有効なトークンでcontextにviewerEmailがセットされ次へ進む', async () => {
    // Given: 有効期限内のトークンが見つかるリポジトリ
    const expiresAt = new Date('2026-09-15T00:00:00.000Z');
    const token = ViewerAccessTokenEntity.reconstruct({
      id: 'token-id-1',
      email: 'viewer@example.com',
      tokenHash: 'hashed-value',
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repository: IViewerAccessTokenRepository = {
      findByEmail: mock(() => Promise.resolve(null)),
      findByTokenHash: mock(() => Promise.resolve(token)),
      save: mock(() => Promise.resolve(token)),
      deleteById: mock(() => Promise.resolve()),
      replace: mock(() => Promise.resolve(token)),
    };
    const app = buildApp(repository, createStubTokenHasher('hashed-value'));

    // When: 有効なトークンヘッダでリクエスト
    const response = await app.request('http://localhost/test', {
      headers: { 'Viewer-Access-Token': 'raw-token' },
    });

    // Then: 200でviewerEmailとトークン有効期限がセットされている
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      viewerEmail: 'viewer@example.com',
      tokenExpiresAt: expiresAt.toISOString(),
    });
    expect(repository.findByTokenHash).toHaveBeenCalledWith('hashed-value');
  });

  test('Viewer-Access-Tokenヘッダが無い場合401になる', async () => {
    // Given: リポジトリが呼ばれないはずの状態
    const repository: IViewerAccessTokenRepository = {
      findByEmail: mock(() => Promise.resolve(null)),
      findByTokenHash: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve({} as ViewerAccessTokenEntity)),
      deleteById: mock(() => Promise.resolve()),
      replace: mock(() => Promise.resolve({} as ViewerAccessTokenEntity)),
    };
    const app = buildApp(repository, createStubTokenHasher('irrelevant'));

    // When: ヘッダ無しでリクエスト
    const response = await app.request('http://localhost/test');

    // Then: 401
    expect(response.status).toBe(401);
    expect(repository.findByTokenHash).not.toHaveBeenCalled();
  });

  test('存在しないトークンの場合401になる', async () => {
    // Given: 検索してもトークンが見つからないリポジトリ
    const repository: IViewerAccessTokenRepository = {
      findByEmail: mock(() => Promise.resolve(null)),
      findByTokenHash: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve({} as ViewerAccessTokenEntity)),
      deleteById: mock(() => Promise.resolve()),
      replace: mock(() => Promise.resolve({} as ViewerAccessTokenEntity)),
    };
    const app = buildApp(repository, createStubTokenHasher('hashed-value'));

    // When: 存在しないトークンでリクエスト
    const response = await app.request('http://localhost/test', {
      headers: { 'Viewer-Access-Token': 'unknown-raw-token' },
    });

    // Then: 401
    expect(response.status).toBe(401);
  });

  test('有効期限を1ミリ秒でも過ぎたトークンは401になる', async () => {
    // Given: 有効期限を過ぎたトークン
    const token = ViewerAccessTokenEntity.reconstruct({
      id: 'token-id-expired',
      email: 'expired@example.com',
      tokenHash: 'hashed-value',
      expiresAt: new Date(Date.now() - 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repository: IViewerAccessTokenRepository = {
      findByEmail: mock(() => Promise.resolve(null)),
      findByTokenHash: mock(() => Promise.resolve(token)),
      save: mock(() => Promise.resolve(token)),
      deleteById: mock(() => Promise.resolve()),
      replace: mock(() => Promise.resolve(token)),
    };
    const app = buildApp(repository, createStubTokenHasher('hashed-value'));

    // When: 期限切れトークンでリクエスト
    const response = await app.request('http://localhost/test', {
      headers: { 'Viewer-Access-Token': 'raw-token' },
    });

    // Then: 401
    expect(response.status).toBe(401);
  });
});
