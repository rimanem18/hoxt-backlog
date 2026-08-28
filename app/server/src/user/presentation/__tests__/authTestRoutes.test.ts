import { describe, expect, test } from 'bun:test';
import authTest from '../authTestRoutes';

describe('authTestRoutes', () => {
  describe('POST /__test__/auth-sessions', () => {
    test('emailが未指定の場合400を返す', async () => {
      // When: emailなしでリクエスト
      const res = await authTest.request('/__test__/auth-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Then: 400 Bad Requestを返す
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    test('emailが文字列以外の場合400を返す', async () => {
      // When: emailが数値でリクエスト
      const res = await authTest.request('/__test__/auth-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 12345 }),
      });

      // Then: 400 Bad Requestを返す
      expect(res.status).toBe(400);
    });
  });
});
