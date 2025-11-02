/**
 * responseValidationMiddleware のテストケース集
 *
 * レスポンスバリデーションミドルウェアの振る舞いを検証する
 * - 開発環境でのバリデーション実行
 * - 本番環境でのバリデーションスキップ
 * - バリデーション失敗時のエラーハンドリング
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Logger } from '@/shared/logging/Logger';
import { createResponseValidationMiddleware } from '../responseValidationMiddleware';

describe('responseValidationMiddleware', () => {
  // テスト前準備: 環境変数を保存・復元して各テストを独立させる
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  /**
   * TC001: レスポンスバリデーション成功（開発環境）
   *
   * 開発環境で正しいスキーマのレスポンスデータがバリデーションを通過することを確認する。
   * Zodバリデーションが成功し、200 OKレスポンスが返却される。
   */
  test('開発環境で正しいレスポンスデータがバリデーションに成功する', async () => {
    // Given: 開発環境を設定
    process.env.NODE_ENV = 'development';

    // Given: ユーザーレスポンス用のZodスキーマを定義
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.uuid(),
        email: z.email(),
        name: z.string(),
      }),
    });

    // Given: モックLoggerを準備
    const mockLogger: Logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Given: バリデーションミドルウェアを適用したエンドポイントを準備
    const app = new Hono();
    app.use(
      '*',
      createResponseValidationMiddleware(responseSchema, mockLogger),
    );
    app.get('/test', (c) =>
      c.json({
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
        },
      }),
    );

    // When: エンドポイントにリクエストを送信
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 200 OKが返る
    expect(response.status).toBe(200);

    // Then: レスポンスデータが変更されずに返却される
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    // Then: エラーログが出力されない
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  /**
   * TC002: レスポンスバリデーションスキップ（本番環境）
   *
   * 本番環境ではパフォーマンス優先のため、レスポンスバリデーションが実行されないことを確認する。
   * NODE_ENV=productionの場合、Zodバリデーションをスキップする。
   */
  test('本番環境でレスポンスバリデーションがスキップされる', async () => {
    // Given: 本番環境を設定
    process.env.NODE_ENV = 'production';

    // Given: Zodスキーマを定義（バリデーションはスキップされる）
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.uuid(),
      }),
    });

    // Given: モックLoggerを準備
    const mockLogger: Logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Given: バリデーションミドルウェアを適用したエンドポイントを準備
    const app = new Hono();
    app.use(
      '*',
      createResponseValidationMiddleware(responseSchema, mockLogger),
    );
    app.get('/test', (c) =>
      c.json({
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
      }),
    );

    // When: エンドポイントにリクエストを送信
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 200 OKが返る
    expect(response.status).toBe(200);

    // Then: レスポンスデータが正常に返却される
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
      },
    });

    // Then: バリデーションがスキップされたためログ出力なし
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  /**
   * TC101: レスポンスバリデーション失敗（UUID形式エラー）
   *
   * 開発環境でUUID形式が不正なレスポンスデータがバリデーションに失敗することを確認する。
   * バリデーション失敗時は500エラーを返し、詳細はログのみに記録する。
   */
  test('開発環境でUUID形式が不正なレスポンスデータがバリデーションに失敗する', async () => {
    // Given: 開発環境を設定
    process.env.NODE_ENV = 'development';

    // Given: UUID形式を要求するZodスキーマを定義
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.uuid(),
      }),
    });

    // Given: モックLoggerを準備
    const mockLogger: Logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Given: 不正なUUID形式のレスポンスを返すエンドポイントを準備
    const app = new Hono();
    app.use(
      '*',
      createResponseValidationMiddleware(responseSchema, mockLogger),
    );
    app.get('/test', (c) =>
      c.json({
        success: true,
        data: {
          id: 'invalid-uuid', // UUID形式ではない文字列
        },
      }),
    );

    // When: エンドポイントにリクエストを送信
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 500 Internal Server Errorが返る
    expect(response.status).toBe(500);

    // Then: クライアントには安全なエラーメッセージのみ返却される
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '一時的にサービスが利用できません',
      },
    });

    // Then: バリデーション失敗の詳細がログに記録される
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  /**
   * TC104: エラーログの適切な出力
   *
   * レスポンスバリデーション失敗時にサーバーログに詳細な情報が記録されることを確認する。
   * ログには必要な情報（エラー詳細、エンドポイント、メソッド、タイムスタンプ）が含まれる。
   */
  test('レスポンスバリデーション失敗時に詳細なエラーログが出力される', async () => {
    // Given: 開発環境を設定
    process.env.NODE_ENV = 'development';

    // Given: 必須フィールドを含むZodスキーマを定義
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.uuid(),
        email: z.email(),
      }),
    });

    // Given: モックLoggerを準備
    const mockLogger: Logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Given: 必須フィールドが欠落したレスポンスを返すエンドポイントを準備
    const app = new Hono();
    app.use(
      '*',
      createResponseValidationMiddleware(responseSchema, mockLogger),
    );
    app.get('/users/123', (c) =>
      c.json({
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          // email フィールドが欠落
        },
      }),
    );

    // When: エンドポイントにリクエストを送信
    await app.request('http://localhost/users/123', {
      method: 'GET',
    });

    // Then: logger.errorが1回呼ばれる
    expect(mockLogger.error).toHaveBeenCalledTimes(1);

    // Then: ログに必要な情報が含まれる
    const call = (mockLogger.error as ReturnType<typeof mock>).mock.calls[0];
    const logMessage = call?.[0];
    const logMeta = call?.[1];

    expect(logMessage).toBe('Response validation failed');

    expect(logMeta).toHaveProperty('error');
    expect(logMeta.error).toHaveProperty('issues');
    expect(logMeta.error).toHaveProperty('name');

    expect(logMeta).toHaveProperty('endpoint', '/users/123');
    expect(logMeta).toHaveProperty('method', 'GET');

    expect(logMeta).toHaveProperty('timestamp');
    expect(typeof logMeta.timestamp).toBe('string');
  });

  /**
   * TC003: レスポンスバリデーション有効化（テスト環境）
   *
   * テスト環境では開発環境と同様にレスポンスバリデーションが有効化されることを確認する。
   * NODE_ENV=testの場合、不正なデータでバリデーションが実行され500エラーが返る。
   */
  test('テスト環境でレスポンスバリデーションが有効化される', async () => {
    // Given: テスト環境を設定
    process.env.NODE_ENV = 'test';

    // Given: UUID形式を要求するZodスキーマを定義
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.uuid(),
      }),
    });

    // Given: モックLoggerを準備
    const mockLogger: Logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Given: 不正なUUID形式のレスポンスを返すエンドポイントを準備
    const app = new Hono();
    app.use(
      '*',
      createResponseValidationMiddleware(responseSchema, mockLogger),
    );
    app.get('/test', (c) =>
      c.json({
        success: true,
        data: {
          id: 'invalid-uuid', // UUID形式ではない
        },
      }),
    );

    // When: エンドポイントにリクエストを送信
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 500 Internal Server Errorが返る（バリデーションが実行されたことを証明）
    expect(response.status).toBe(500);

    // Then: クライアントには安全なエラーメッセージのみ返却される
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '一時的にサービスが利用できません',
      },
    });

    // Then: バリデーション失敗の詳細がログに記録される
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  /**
   * TC102: レスポンスバリデーション失敗（必須フィールド欠落）
   *
   * 開発環境で必須フィールドが欠落したレスポンスデータがバリデーションに失敗することを確認する。
   * 必須フィールド欠落時は500エラーを返し、詳細はログのみに記録する。
   */
  test('開発環境で必須フィールドが欠落したレスポンスデータがバリデーションに失敗する', async () => {
    // Given: 開発環境を設定
    process.env.NODE_ENV = 'development';

    // Given: 必須フィールドを含むZodスキーマを定義
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.uuid(),
        externalId: z.string(),
        provider: z.string(),
        email: z.email(),
        name: z.string(),
      }),
    });

    // Given: モックLoggerを準備
    const mockLogger: Logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Given: 必須フィールドが欠落したレスポンスを返すエンドポイントを準備
    const app = new Hono();
    app.use(
      '*',
      createResponseValidationMiddleware(responseSchema, mockLogger),
    );
    app.get('/test', (c) =>
      c.json({
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          externalId: 'google_user_123',
          provider: 'google',
          // email フィールドが欠落
          name: 'Test User',
        },
      }),
    );

    // When: エンドポイントにリクエストを送信
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 500 Internal Server Errorが返る
    expect(response.status).toBe(500);

    // Then: クライアントには安全なエラーメッセージのみ返却される
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '一時的にサービスが利用できません',
      },
    });

    // Then: バリデーション失敗の詳細がログに記録される
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  /**
   * TC103: レスポンスバリデーション失敗（型の不一致）
   *
   * 開発環境でフィールドの型が不正なレスポンスデータがバリデーションに失敗することを確認する。
   * 型の不一致時は500エラーを返し、詳細はログのみに記録する。
   */
  test('開発環境でフィールドの型が不正なレスポンスデータがバリデーションに失敗する', async () => {
    // Given: 開発環境を設定
    process.env.NODE_ENV = 'development';

    // Given: 型を厳密に定義するZodスキーマを定義
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.uuid(),
        externalId: z.string(),
        provider: z.string(),
        email: z.email(),
        name: z.string(),
      }),
    });

    // Given: モックLoggerを準備
    const mockLogger: Logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Given: 型が不一致のレスポンスを返すエンドポイントを準備
    const app = new Hono();
    app.use(
      '*',
      createResponseValidationMiddleware(responseSchema, mockLogger),
    );
    app.get('/test', (c) =>
      c.json({
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          externalId: 12345, // 数値型（string型であるべき）
          provider: 'google',
          email: 'test@example.com',
          name: 'Test User',
        },
      }),
    );

    // When: エンドポイントにリクエストを送信
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 500 Internal Server Errorが返る
    expect(response.status).toBe(500);

    // Then: クライアントには安全なエラーメッセージのみ返却される
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '一時的にサービスが利用できません',
      },
    });

    // Then: バリデーション失敗の詳細がログに記録される
    expect(mockLogger.error).toHaveBeenCalledTimes(1);

    // Then: ログに型の不一致エラーが含まれる
    const call = (mockLogger.error as ReturnType<typeof mock>).mock.calls[0];
    const logMeta = call?.[1];
    expect(logMeta.error.issues).toBeDefined();
    expect(logMeta.error.issues.length).toBeGreaterThan(0);
  });

  /**
   * TC203: null値を含むレスポンスデータ
   *
   * nullable フィールドに null が含まれるレスポンスデータがバリデーションに成功することを確認する。
   * null は有効な値として扱われ、正常にレスポンスが返却される。
   */
  test('nullableフィールドにnullを含むレスポンスデータがバリデーションに成功する', async () => {
    // Given: 開発環境を設定
    process.env.NODE_ENV = 'development';

    // Given: nullableフィールドを含むZodスキーマを定義
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.uuid(),
        externalId: z.string(),
        provider: z.string(),
        email: z.email(),
        name: z.string(),
        avatarUrl: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
        lastLoginAt: z.string().nullable(),
      }),
    });

    // Given: モックLoggerを準備
    const mockLogger: Logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Given: nullableフィールドにnullを含むレスポンスを返すエンドポイントを準備
    const app = new Hono();
    app.use(
      '*',
      createResponseValidationMiddleware(responseSchema, mockLogger),
    );
    app.get('/test', (c) =>
      c.json({
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          externalId: 'google_user_123',
          provider: 'google',
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: null,
          createdAt: '2025-11-02T10:00:00Z',
          updatedAt: '2025-11-02T10:00:00Z',
          lastLoginAt: null,
        },
      }),
    );

    // When: エンドポイントにリクエストを送信
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 200 OKが返る
    expect(response.status).toBe(200);

    // Then: nullを含むレスポンスデータが正常に返却される
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        externalId: 'google_user_123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: '2025-11-02T10:00:00Z',
        updatedAt: '2025-11-02T10:00:00Z',
        lastLoginAt: null,
      },
    });

    // Then: エラーログが出力されない
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
