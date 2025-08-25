/**
 * userRoutes統合テスト
 *
 * HTTPエンドポイントとしての完全動作をエンドツーエンドで確認。
 * ルーティング→UserController→レスポンスの統合フローをテストする。
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
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import userRoutes from '../userRoutes';

describe('GET /api/user/profile 統合テスト', () => {
  let app: Hono;

  beforeAll(async () => {
    // テスト用Honoサーバーインスタンスを起動
    app = new Hono();

    // CORSミドルウェアの設定
    app.use(
      '*',
      cors({
        origin: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }),
    );

    // userRoutesをマウント
    app.route('/api', userRoutes);
  });

  afterAll(async () => {
    // サーバーインスタンスの適切な終了とリソース解放
  });

  beforeEach(() => {
    // 各統合テスト実行前の独立環境準備
  });

  afterEach(() => {
    // 統合テスト実行後のリソース クリーンアップ
  });

  describe('正常系', () => {
    test('有効なJWTで認証成功してユーザー情報が取得される', async () => {
      // Given: 有効なJWTトークンを含むAuthorizationヘッダー
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid.token';
      
      const request = new Request('http://localhost/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: プロフィール取得エンドポイントにリクエストを送信
      const response = await app.request(request);

      // Then: ステータス200でユーザー情報が返却される
      expect(response.status).toBe(200);
      
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          name: expect.any(String),
          avatarUrl: expect.any(String),
          provider: expect.any(String),
          externalId: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      });

      // Content-Typeの確認
      expect(response.headers.get('Content-Type')).toMatch(/application\/json/);
    });

    test('プロフィール取得が500ms以内で完了する', async () => {
      // Given: 有効なJWTトークン
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid.token';
      
      const request = new Request('http://localhost/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: レスポンス時間を測定しながらリクエストを送信
      const startTime = performance.now();
      const response = await app.request(request);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Then: 500ms以内で応答する
      expect(responseTime).toBeLessThan(500);
      expect(response.status).toBe(200);
    });

    test('CORS対応確認：プリフライトリクエスト処理', async () => {
      // Given: プリフライトリクエスト（OPTIONS メソッド）
      const preflightRequest = new Request('http://localhost/api/user/profile', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization, Content-Type',
        },
      });

      // When: プリフライトリクエストを送信
      const response = await app.request(preflightRequest);

      // Then: CORS ヘッダーが正しく設定される
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Methods')).toMatch(/GET/);
      expect(response.headers.get('Access-Control-Allow-Headers')).toMatch(/Authorization/);
      expect(response.headers.get('Access-Control-Allow-Headers')).toMatch(/Content-Type/);
    });
  });

  describe('異常系', () => {
    test('Authorizationヘッダーなしで認証エラーが返される', async () => {
      // Given: Authorizationヘッダーなしのリクエスト
      const request = new Request('http://localhost/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // When: プロフィール取得エンドポイントにリクエストを送信
      const response = await app.request(request);

      // Then: ステータス401で認証エラーが返却される
      expect(response.status).toBe(401);
      
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'ログインが必要です',
        },
      });
    });

    test('無効なJWTで認証エラーが返される', async () => {
      // Given: 無効なJWTトークン
      const invalidJWT = 'invalid.jwt.token';
      
      const request = new Request('http://localhost/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${invalidJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: プロフィール取得エンドポイントにリクエストを送信
      const response = await app.request(request);

      // Then: ステータス401で認証エラーが返却される
      expect(response.status).toBe(401);
      
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'ログインが必要です',
        },
      });
    });

    test('ユーザーが存在しない場合404エラーが返される', async () => {
      // Given: 存在しないユーザーのJWTトークン（仮想的に設定）
      const nonExistentUserJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.nonexistent.token';
      
      const request = new Request('http://localhost/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${nonExistentUserJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: プロフィール取得エンドポイントにリクエストを送信
      const response = await app.request(request);

      // Then: ステータス404でユーザー未存在エラーが返却される
      expect(response.status).toBe(404);
      
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      });
    });

    test('サーバー内部エラー時500エラーが返される', async () => {
      // Given: データベース障害などを引き起こすJWTトークン（仮想的に設定）
      const errorCausingJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.servererror.token';
      
      const request = new Request('http://localhost/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${errorCausingJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: プロフィール取得エンドポイントにリクエストを送信
      const response = await app.request(request);

      // Then: ステータス500で内部エラーが返却される
      expect(response.status).toBe(500);
      
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'システム内部エラーが発生しました',
        },
      });
    });
  });

  describe('境界値テスト', () => {
    test('期限切れJWTで認証エラーが返される', async () => {
      // Given: 期限切れのJWTトークン
      const expiredJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token';
      
      const request = new Request('http://localhost/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${expiredJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: プロフィール取得エンドポイントにリクエストを送信
      const response = await app.request(request);

      // Then: ステータス401で認証エラーが返却される
      expect(response.status).toBe(401);
      
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'ログインが必要です',
        },
      });
    });

    test('同時リクエスト処理：100リクエスト/分の負荷テスト', async () => {
      // Given: 有効なJWTトークンで100件のリクエストを準備
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid.token';
      
      const requests = Array(100).fill(null).map(() => 
        new Request('http://localhost/api/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${validJWT}`,
            'Content-Type': 'application/json',
          },
        })
      );

      // When: 同時に100件のリクエストを送信
      const startTime = performance.now();
      const responses = await Promise.all(
        requests.map(request => app.request(request))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Then: すべてのリクエストが成功し、60秒以内で完了する
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(totalTime).toBeLessThan(60000); // 60秒以内
    });

    test('大量データレスポンス処理テスト', async () => {
      // Given: 大きなプロフィールデータを持つユーザーのJWTトークン
      const largeDataUserJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.largedata.token';
      
      const request = new Request('http://localhost/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${largeDataUserJWT}`,
          'Content-Type': 'application/json',
        },
      });

      // When: 大量データを持つユーザーの情報を取得
      const response = await app.request(request);

      // Then: 正常にレスポンスが返却される
      expect(response.status).toBe(200);
      
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toBeDefined();
    });

    test('POSTメソッドでMethod Not Allowedエラーが返される', async () => {
      // Given: POSTメソッドでのリクエスト
      const request = new Request('http://localhost/api/user/profile', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid.jwt.token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      // When: プロフィール取得エンドポイントにPOSTリクエストを送信
      const response = await app.request(request);

      // Then: ステータス405でMethod Not Allowedエラーが返却される
      expect(response.status).toBe(405);
      
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'このエンドポイントはGETメソッドのみ対応しています',
        },
      });
    });
  });
});