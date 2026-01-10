/**
 * authMiddleware のユニットテスト
 *
 * JWT検証後のユーザーDB検索とContext設定の振る舞いを検証する
 */

import { describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthProvider } from '@/domain/user/AuthProvider';
import type { IUserRepository } from '@/domain/user/IUserRepository';
import type { User } from '@/domain/user/UserEntity';
import { AuthError } from '../../errors/AuthError';
import { type AuthMiddlewareOptions, authMiddleware } from '../AuthMiddleware';

describe('authMiddleware - ユーザーDB検索', () => {
  test('JWT検証後、findByExternalIdでユーザーを検索しcontextにDBのUUIDをセット', async () => {
    // Given: DBに存在するユーザー
    const mockUser: User = {
      id: 'db-uuid-12345',
      externalId: 'external-id-67890',
      provider: 'google' as AuthProvider,
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: null,
    };

    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(mockUser)),
      findById: mock(() => Promise.resolve(null)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(mockUser)),
      update: mock(() => Promise.resolve(mockUser)),
      delete: mock(() => Promise.resolve()),
    };

    // Given: テスト用のモックペイロード（JWT検証をバイパス）
    const mockPayload = {
      sub: 'external-id-67890',
      email: 'test@example.com',
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
    };

    const options: AuthMiddlewareOptions = {
      userRepository: mockUserRepository,
      mockPayload,
    };

    // Given: Honoアプリケーションにミドルウェアを適用
    const app = new Hono();
    app.use('*', authMiddleware(options));
    app.get('/test', (c) => {
      // Then: context.userIdにDBのUUIDがセットされていることを確認
      const userId = c.get('userId');
      return c.json({ userId });
    });

    // When: リクエスト実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    });

    // Then: レスポンスステータス200
    expect(response.status).toBe(200);

    // Then: レスポンスボディにDBのUUIDが含まれる
    const body = await response.json();
    expect(body).toHaveProperty('userId', 'db-uuid-12345');

    // Then: findByExternalIdが正しいパラメータで呼ばれた
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledTimes(1);
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
      'external-id-67890',
      'google',
    );
  });

  test('ユーザーが見つからない場合、USER_NOT_FOUNDエラーをスロー', async () => {
    // Given: DBにユーザーが存在しない
    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(null)),
      findById: mock(() => Promise.resolve(null)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({} as User)),
      update: mock(() => Promise.resolve({} as User)),
      delete: mock(() => Promise.resolve()),
    };

    // Given: テスト用のモックペイロード
    const mockPayload = {
      sub: 'non-existent-external-id',
      email: 'nonexistent@example.com',
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
    };

    const options: AuthMiddlewareOptions = {
      userRepository: mockUserRepository,
      mockPayload,
    };

    // Given: Honoアプリケーションにエラーハンドラーとミドルウェアを適用
    const app = new Hono();
    app.use('*', authMiddleware(options));
    app.get('/test', (c) => c.json({ message: 'Success' }));

    // AuthErrorをキャッチしてJSONレスポンスに変換
    app.onError((err, c) => {
      if (err instanceof AuthError) {
        return c.json(err.toJSON(), err.status as any);
      }
      return c.json({ success: false, error: { message: err.message } }, 500);
    });

    // When: リクエスト実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    });

    // Then: 401エラーレスポンス
    expect(response.status).toBe(401);

    // Then: findByExternalIdが呼ばれた
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledTimes(1);
  });

  test('app_metadataにproviderが含まれない場合、デフォルトでgoogleを使用', async () => {
    // Given: DBに存在するユーザー
    const mockUser: User = {
      id: 'db-uuid-99999',
      externalId: 'external-id-99999',
      provider: 'google' as AuthProvider,
      email: 'test2@example.com',
      name: 'Test User 2',
      avatarUrl: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: null,
    };

    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(mockUser)),
      findById: mock(() => Promise.resolve(null)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(mockUser)),
      update: mock(() => Promise.resolve(mockUser)),
      delete: mock(() => Promise.resolve()),
    };

    // Given: app_metadataにproviderが含まれないペイロード
    const mockPayload = {
      sub: 'external-id-99999',
      email: 'test2@example.com',
      // app_metadataなし
    };

    const options: AuthMiddlewareOptions = {
      userRepository: mockUserRepository,
      mockPayload,
    };

    // Given: Honoアプリケーション
    const app = new Hono();
    app.use('*', authMiddleware(options));
    app.get('/test', (c) => c.json({ userId: c.get('userId') }));

    // When: リクエスト実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    });

    // Then: 成功
    expect(response.status).toBe(200);

    // Then: findByExternalIdがデフォルトで'google'で呼ばれた
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
      'external-id-99999',
      'google',
    );
  });

  test('payload.subが空の場合、AUTHENTICATION_REQUIREDエラーをスロー', async () => {
    // Given: モックリポジトリ
    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(null)),
      findById: mock(() => Promise.resolve(null)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({} as User)),
      update: mock(() => Promise.resolve({} as User)),
      delete: mock(() => Promise.resolve()),
    };

    // Given: subが空のペイロード
    const mockPayload = {
      sub: '',
      email: 'test@example.com',
    };

    const options: AuthMiddlewareOptions = {
      userRepository: mockUserRepository,
      mockPayload,
    };

    // Given: Honoアプリケーションにエラーハンドラーを追加
    const app = new Hono();
    app.use('*', authMiddleware(options));
    app.get('/test', (c) => c.json({ message: 'Success' }));

    // AuthErrorをキャッチしてJSONレスポンスに変換
    app.onError((err, c) => {
      if (err instanceof AuthError) {
        return c.json(err.toJSON(), err.status as any);
      }
      return c.json({ success: false, error: { message: err.message } }, 500);
    });

    // When: リクエスト実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    });

    // Then: 401エラー
    expect(response.status).toBe(401);

    // Then: findByExternalIdは呼ばれない（subが空でエラー）
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledTimes(0);
  });

  test('サポートされていないproviderの場合、AUTHENTICATION_REQUIREDエラーをスロー', async () => {
    // Given: モックリポジトリ
    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(null)),
      findById: mock(() => Promise.resolve(null)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({} as User)),
      update: mock(() => Promise.resolve({} as User)),
      delete: mock(() => Promise.resolve()),
    };

    // Given: サポートされていないproviderを含むペイロード
    const mockPayload = {
      sub: 'external-id-12345',
      email: 'test@example.com',
      app_metadata: {
        provider: 'unknown-provider', // サポート外
        providers: ['unknown-provider'],
      },
    };

    const options: AuthMiddlewareOptions = {
      userRepository: mockUserRepository,
      mockPayload,
    };

    // Given: Honoアプリケーションにエラーハンドラーを追加
    const app = new Hono();
    app.use('*', authMiddleware(options));
    app.get('/test', (c) => c.json({ message: 'Success' }));

    // AuthErrorをキャッチしてJSONレスポンスに変換
    app.onError((err, c) => {
      if (err instanceof AuthError) {
        return c.json(err.toJSON(), err.status as any);
      }
      return c.json({ success: false, error: { message: err.message } }, 500);
    });

    // When: リクエスト実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    });

    // Then: 401エラー
    expect(response.status).toBe(401);

    // Then: エラーメッセージに不正なproviderが含まれる
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('message');
    expect(body.error.message).toContain('サポートされていないプロバイダー');
    expect(body.error.message).toContain('unknown-provider');

    // Then: findByExternalIdは呼ばれない（providerバリデーションで拒否）
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledTimes(0);
  });
});
