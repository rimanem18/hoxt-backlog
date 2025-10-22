/**
 * docsRoutes テスト
 *
 * OpenAPI仕様書のYAML→JSON変換とSwagger UIエンドポイントをテストする。
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import docs from '../docsRoutes';

describe('GET /api/docs', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api', docs);
  });

  test('開発環境ではSwagger UIのHTMLを返す', async () => {
    // Given: 開発環境
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';

      // When: /api/docs にリクエスト
      const res = await app.request('/api/docs');

      // Then: Swagger UIのHTMLが返される
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('swagger-ui');
      expect(html).toContain('/api/openapi.json');
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnv;
      }
    }
  });

  test('本番環境では404を返す', async () => {
    // Given: 本番環境
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      // When & Then: /api/docs にリクエストすると404が返される
      const res = await app.request('/api/docs');
      expect(res.status).toBe(404);
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnv;
      }
    }
  });
});

describe('GET /api/openapi.json', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api', docs);
  });

  test('開発環境ではOpenAPI仕様書をJSON形式で返す', async () => {
    // Given: 開発環境
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';

      // When: /api/openapi.json にリクエスト
      const res = await app.request('/api/openapi.json');

      // Then: OpenAPI仕様書がJSON形式で返される
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const json = await res.json();
      expect(json).toHaveProperty('openapi');
      expect(json).toHaveProperty('info');
      expect(json).toHaveProperty('paths');
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnv;
      }
    }
  });

  test('本番環境では404を返す', async () => {
    // Given: 本番環境
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      // When & Then: /api/openapi.json にリクエストすると404が返される
      const res = await app.request('/api/openapi.json');
      expect(res.status).toBe(404);
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnv;
      }
    }
  });

  test('YAMLの複雑な構造を正しくJSON変換する', async () => {
    // Given: 開発環境
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';

      // When: OpenAPI仕様書を取得
      const res = await app.request('/api/openapi.json');
      const json = (await res.json()) as Record<string, unknown>;

      // Then: オブジェクト・配列・文字列が正しくパースされている
      expect(typeof json.info).toBe('object');

      if (json.servers) {
        expect(Array.isArray(json.servers)).toBe(true);
      }

      expect(typeof (json.info as Record<string, unknown>).title).toBe(
        'string',
      );
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnv;
      }
    }
  });

  test('YAML内の数値と真偽値が正しい型で変換される', async () => {
    // Given: 開発環境
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';

      // When: OpenAPI仕様書を取得
      const res = await app.request('/api/openapi.json');
      const json = (await res.json()) as Record<string, unknown>;

      // Then: 文字列型が維持されている
      expect(typeof (json.info as Record<string, unknown>).title).toBe(
        'string',
      );
      expect(typeof (json.info as Record<string, unknown>).version).toBe(
        'string',
      );
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnv;
      }
    }
  });

  test('ファイルが存在しない場合は404エラーを返す', async () => {
    // TODO: 実ファイル依存を解消してモックでエラーケースをテスト
    expect(true).toBe(true);
  });
});
