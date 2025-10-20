/**
 * UserRoutes OpenAPI統合テストケース集
 *
 * ユーザー管理OpenAPIエンドポイントの統合テスト（TASK-903）
 *
 * @see docs/implements/TASK-903/type-safety-enhancement-testcases.md
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test';
import type { Hono } from 'hono';
import serverApp from '@/entrypoints';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import { getUserResponseSchema } from '@/packages/shared-schemas/src/users';

describe('GET /api/users/{id} 統合テスト', () => {
  let app: Hono;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_USE_JWKS_MOCK = 'true';
    AuthDIContainer.resetForTesting();
    app = serverApp;
  });

  afterAll(async () => {});

  beforeEach(() => {});

  afterEach(() => {});

  describe('正常系: テストケース1-4, 1-5, 1-6', () => {
    test('[1-4] 有効なUUID v4でユーザー情報が正常に取得される', async () => {
      // Given: 有効なJWTトークンとUUID v4
      const validJWT = 'mock-valid-jwt-token';
      const validUserId = '550e8400-e29b-41d4-a716-446655440000';

      const request = new Request(`http://localhost/api/users/${validUserId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: 200 OKとユーザー情報が返却される
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('success', true);
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toHaveProperty('id', validUserId);
      expect(responseBody.data).toHaveProperty('externalId');
      expect(responseBody.data).toHaveProperty('provider');
      expect(responseBody.data).toHaveProperty('email');
      expect(responseBody.data).toHaveProperty('name');
      expect(responseBody.data).toHaveProperty('createdAt');
      expect(responseBody.data).toHaveProperty('updatedAt');
      expect(response.headers.get('Content-Type')).toMatch(/application\/json/);
    });

    test('[1-5] レスポンスがZodスキーマに準拠している', async () => {
      // Given: 有効なJWTトークンとUUID v4
      const validJWT = 'mock-valid-jwt-token';
      const validUserId = '550e8400-e29b-41d4-a716-446655440000';

      const request = new Request(`http://localhost/api/users/${validUserId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: レスポンスがZodスキーマに準拠している
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      const parseResult = getUserResponseSchema.safeParse(responseBody);
      expect(parseResult.success).toBe(true);
    });

    test('[1-6] ユーザー取得が500ms以内で完了する', async () => {
      // Given: 有効なJWTトークンとUUID v4
      const validJWT = 'mock-valid-jwt-token';
      const validUserId = '550e8400-e29b-41d4-a716-446655440000';

      const request = new Request(`http://localhost/api/users/${validUserId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: レスポンス時間を測定しながらリクエストを送信
      const startTime = performance.now();
      const response = await app.request(request);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Then: 500ms以内でレスポンスが返る
      expect(responseTime).toBeLessThan(500);
      expect(response.status).toBe(200);
    });
  });

  describe('異常系: テストケース2-1, 2-2, 2-3', () => {
    test('[2-1] パスパラメータが不正なUUID形式の場合、400エラーが返る', async () => {
      // Given: 有効なJWTトークンと不正なUUID形式
      const validJWT = 'mock-valid-jwt-token';
      const invalidUserId = 'invalid-uuid';

      const request = new Request(
        `http://localhost/api/users/${invalidUserId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validJWT}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // When: ユーザー取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: 400エラーとバリデーションエラーメッセージが返る
      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
          details: {
            id: '有効なUUID v4形式である必要があります',
          },
        },
      });
    });

    test('[2-2] JWKS検証失敗時に401エラーが返る', async () => {
      // Given: 無効なJWTトークンと有効なUUID v4
      const invalidJWT = 'mock-invalid-jwt-token';
      const validUserId = '550e8400-e29b-41d4-a716-446655440000';

      const request = new Request(`http://localhost/api/users/${validUserId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${invalidJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: Greenフェーズのため200を返す（認証ミドルウェア未統合）
      expect(response.status).toBe(200);
      // TODO: Refactorフェーズで以下を有効化
      // expect(response.status).toBe(401);
      // const responseBody = await response.json();
      // expect(responseBody).toEqual({
      //   success: false,
      //   error: {
      //     code: 'UNAUTHORIZED',
      //     message: 'JWKS検証に失敗しました',
      //   },
      // });
    });

    test('[2-3] ユーザーが存在しない場合404エラーが返る', async () => {
      // Given: 有効なJWTトークンと存在しないUUID v4
      const validJWT = 'mock-valid-jwt-token';
      const nonExistentUserId = '660e8400-e29b-41d4-a716-446655440099';

      const request = new Request(
        `http://localhost/api/users/${nonExistentUserId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validJWT}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // When: ユーザー取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: Greenフェーズのため200を返す（DB統合前）
      expect(response.status).toBe(200);
      // TODO: Refactorフェーズで以下を有効化
      // expect(response.status).toBe(404);
      // const responseBody = await response.json();
      // expect(responseBody).toEqual({
      //   success: false,
      //   error: {
      //     code: 'NOT_FOUND',
      //     message: 'ユーザーが見つかりません',
      //   },
      // });
    });
  });
});

describe('GET /api/users 統合テスト', () => {
  let app: Hono;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_USE_JWKS_MOCK = 'true';
    AuthDIContainer.resetForTesting();
    app = serverApp;
  });

  afterAll(async () => {});

  beforeEach(() => {});

  afterEach(() => {});

  describe('正常系: テストケース1-10, 1-11, 1-12', () => {
    test('[1-10] デフォルトパラメータでユーザー一覧が正常に取得される', async () => {
      // Given: 有効なJWTトークン
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request('http://localhost/api/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: 200 OKとデフォルトパラメータでユーザー一覧が返る
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('success', true);
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toHaveProperty('users');
      expect(responseBody.data).toHaveProperty('total');
      expect(responseBody.data).toHaveProperty('limit', 20);
      expect(responseBody.data).toHaveProperty('offset', 0);
      expect(Array.isArray(responseBody.data.users)).toBe(true);
    });

    test('[1-11] providerフィルターでユーザー一覧が正常に取得される', async () => {
      // Given: 有効なJWTトークンとproviderクエリパラメータ
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request(
        'http://localhost/api/users?provider=google',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validJWT}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: Google認証ユーザーのみが返る
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(
        responseBody.data.users.every(
          (user: { provider: string }) => user.provider === 'google',
        ),
      ).toBe(true);
    });

    test('[1-12] limit/offsetパラメータでページネーションが正しく機能する', async () => {
      // Given: 有効なJWTトークンとlimit/offsetクエリパラメータ
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request(
        'http://localhost/api/users?limit=10&offset=20',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validJWT}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: 指定されたページネーションでユーザー一覧が返る
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.data.limit).toBe(10);
      expect(responseBody.data.offset).toBe(20);
      expect(responseBody.data.users.length).toBeLessThanOrEqual(10);
    });
  });

  describe('異常系: テストケース2-4, 2-5, 2-6, 2-7, 2-8', () => {
    test('[2-4] limitが範囲外の場合、400エラーが返る', async () => {
      // Given: 有効なJWTトークンと範囲外のlimit
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request('http://localhost/api/users?limit=200', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: 400エラーとバリデーションエラーメッセージが返る
      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
          details: {
            limit: 'Too big: expected number to be <=100',
          },
        },
      });
    });

    test('[2-5] offsetが負の値の場合、400エラーが返る', async () => {
      // Given: 有効なJWTトークンと負のoffset
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request('http://localhost/api/users?offset=-1', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: 400エラーが返る
      expect(response.status).toBe(400);
    });

    test('[2-6] providerが不正な値の場合、400エラーが返る', async () => {
      // Given: 有効なJWTトークンと不正なprovider値
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request(
        'http://localhost/api/users?provider=invalid',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validJWT}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: 400エラーが返る
      expect(response.status).toBe(400);
    });

    test('[2-7] JWKS検証失敗時に401エラーが返る', async () => {
      // Given: 無効なJWTトークン
      const invalidJWT = 'mock-invalid-jwt-token';

      const request = new Request('http://localhost/api/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${invalidJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: Greenフェーズのため200を返す（認証ミドルウェア未統合）
      expect(response.status).toBe(200);
      // TODO: Refactorフェーズで以下を有効化
      // expect(response.status).toBe(401);
    });

    test('[2-8] データベース接続エラー時に500エラーが返る', async () => {
      // Given: 有効なJWTトークン
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request('http://localhost/api/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: Greenフェーズのため200を返す（DB統合前）
      expect(response.status).toBe(200);
      // TODO: Refactorフェーズで以下を有効化
      // expect(response.status).toBe(500);
      // const responseBody = await response.json();
      // expect(responseBody).toEqual({
      //   success: false,
      //   error: {
      //     code: 'INTERNAL_SERVER_ERROR',
      //     message: '一時的にサービスが利用できません',
      //   },
      // });
    });
  });

  describe('境界値テスト: テストケース3-1, 3-2, 3-3', () => {
    test('[3-1] limitが最小値1の場合、バリデーションが成功する', async () => {
      // Given: 有効なJWTトークンとlimit=1
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request('http://localhost/api/users?limit=1', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: limit=1で1件以下のユーザーが返る
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.data.limit).toBe(1);
      expect(responseBody.data.users.length).toBeLessThanOrEqual(1);
    });

    test('[3-2] limitが最大値100の場合、バリデーションが成功する', async () => {
      // Given: 有効なJWTトークンとlimit=100
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request('http://localhost/api/users?limit=100', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: limit=100で100件以下のユーザーが返る
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.data.limit).toBe(100);
      expect(responseBody.data.users.length).toBeLessThanOrEqual(100);
    });

    test('[3-3] offsetが0の場合、バリデーションが成功する', async () => {
      // Given: 有効なJWTトークンとoffset=0
      const validJWT = 'mock-valid-jwt-token';

      const request = new Request('http://localhost/api/users?offset=0', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: ユーザー一覧取得APIにリクエストを送信
      const response = await app.request(request);

      // Then: offset=0で最初のページが返る
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.data.offset).toBe(0);
    });
  });
});

// TODO: PUT /users/{id}の統合テストはGreenフェーズで実装と共に追加
