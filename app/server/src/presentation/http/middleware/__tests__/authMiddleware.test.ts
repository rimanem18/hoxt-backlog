import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Next } from 'hono';
import type { JwtVerificationResult } from '@/domain/services/IAuthProvider';
import { authMiddleware } from '../authMiddleware';
import { JwtVerificationError } from '../errors/AuthMiddlewareErrors';
import { createMockContext } from './helpers';

describe('authMiddleware', () => {
  let mockNext: Next;
  let mockRlsHelper: {
    setCurrentUser: ReturnType<typeof mock>;
  };
  let mockDb: object;

  beforeEach(() => {
    // next関数のモック
    mockNext = mock(async () => {});

    // RlsHelperのモック
    mockRlsHelper = {
      setCurrentUser: mock(async () => {}),
    };

    // DBインスタンスのモック
    mockDb = {};
  });

  describe('Authorizationヘッダー検証', () => {
    test('Authorizationヘッダーなしで401エラーを返す', async () => {
      // Given: Authorizationヘッダーなし
      const mockContext = createMockContext({});

      // When: authMiddleware実行
      const response = await authMiddleware(mockContext, mockNext);

      // Then: 401エラー
      expect(response).toBeDefined();
      const json = await response?.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      expect(response?.status).toBe(401);

      // next()は呼び出されない
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Bearerスキーム以外で401エラーを返す', async () => {
      // Given: Basic認証スキーム
      const mockContext = createMockContext({
        Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
      });

      // When: authMiddleware実行
      const response = await authMiddleware(mockContext, mockNext);

      // Then: 401エラー
      expect(response).toBeDefined();
      const json = await response?.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      expect(response?.status).toBe(401);

      // next()は呼び出されない
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Bearer後に空白のみで401エラーを返す', async () => {
      // Given: Bearerスキームだが空トークン
      const mockContext = createMockContext({
        Authorization: 'Bearer   ',
      });

      // When: authMiddleware実行
      const response = await authMiddleware(mockContext, mockNext);

      // Then: 401エラー
      expect(response).toBeDefined();
      const json = await response?.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      expect(response?.status).toBe(401);

      // next()は呼び出されない
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('JWT検証', () => {
    test('無効なJWTで401エラーを返す', async () => {
      // Given: 無効なJWT
      const mockContext = createMockContext({
        Authorization: 'Bearer invalid-token',
      });

      const mockVerifyFn = mock(
        async (): Promise<JwtVerificationResult> => ({
          valid: false,
          error: 'Invalid signature',
        }),
      );

      // When: authMiddleware実行（verifierをモック注入）
      const response = await authMiddleware(
        mockContext,
        mockNext,
        mockVerifyFn,
        mockRlsHelper.setCurrentUser,
      );

      // Then: 401エラー
      expect(response).toBeDefined();
      const json = await response?.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'JWT検証に失敗しました',
        },
      });
      expect(response?.status).toBe(401);

      // JWT検証が呼び出された
      expect(mockVerifyFn).toHaveBeenCalledWith('invalid-token');

      // next()は呼び出されない
      expect(mockNext).not.toHaveBeenCalled();

      // RLS設定は呼び出されない
      expect(mockRlsHelper.setCurrentUser).not.toHaveBeenCalled();
    });

    test('JWT検証でpayloadがnullの場合に401エラーを返す', async () => {
      // Given: 検証は成功だがpayloadなし
      const mockContext = createMockContext({
        Authorization: 'Bearer valid-token',
      });

      const mockVerifyFn = mock(
        async (): Promise<JwtVerificationResult> => ({
          valid: true,
        }),
      );

      // When: authMiddleware実行
      const response = await authMiddleware(
        mockContext,
        mockNext,
        mockVerifyFn,
        mockRlsHelper.setCurrentUser,
      );

      // Then: 401エラー
      expect(response).toBeDefined();
      const json = await response?.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'JWT検証に失敗しました',
        },
      });
      expect(response?.status).toBe(401);
    });

    test('payload.subが存在しない場合に401エラーを返す', async () => {
      // Given: payloadはあるがsubがない
      const mockContext = createMockContext({
        Authorization: 'Bearer valid-token',
      });

      const mockVerifyFn = mock(
        async (): Promise<JwtVerificationResult> => ({
          valid: true,
          payload: {
            sub: '',
            email: 'test@example.com',
            exp: Date.now() / 1000 + 3600,
            iat: Date.now() / 1000,
            iss: 'https://example.supabase.co/auth/v1',
            user_metadata: { name: 'Test User' },
            app_metadata: { provider: 'google' },
          },
        }),
      );

      // When: authMiddleware実行
      const response = await authMiddleware(
        mockContext,
        mockNext,
        mockVerifyFn,
        mockRlsHelper.setCurrentUser,
      );

      // Then: 401エラー
      expect(response).toBeDefined();
      const json = await response?.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'JWT検証に失敗しました',
        },
      });
      expect(response?.status).toBe(401);
    });

    test('JWT検証で例外が発生した場合に401エラーを返す', async () => {
      // Given: verifierが例外をスロー
      const mockContext = createMockContext({
        Authorization: 'Bearer error-token',
      });

      const mockVerifyFn = mock(async () => {
        throw new JwtVerificationError('Network error');
      });

      // When: authMiddleware実行
      const response = await authMiddleware(
        mockContext,
        mockNext,
        mockVerifyFn,
        mockRlsHelper.setCurrentUser,
      );

      // Then: 401エラー
      expect(response).toBeDefined();
      const json = await response?.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'JWT検証に失敗しました',
        },
      });
      expect(response?.status).toBe(401);

      // next()は呼び出されない
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('正常な認証フロー', () => {
    test('有効なJWTでRLS設定し、next()を呼び出す', async () => {
      // Given: 有効なJWT
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockContext = createMockContext(
        {
          Authorization: 'Bearer valid-token',
        },
        { db: mockDb },
      );

      const mockVerifyFn = mock(
        async (): Promise<JwtVerificationResult> => ({
          valid: true,
          payload: {
            sub: userId,
            email: 'test@example.com',
            exp: Date.now() / 1000 + 3600,
            iat: Date.now() / 1000,
            iss: 'https://example.supabase.co/auth/v1',
            user_metadata: { name: 'Test User' },
            app_metadata: { provider: 'google' },
          },
        }),
      );

      // When: authMiddleware実行
      await authMiddleware(
        mockContext,
        mockNext,
        mockVerifyFn,
        mockRlsHelper.setCurrentUser,
      );

      // Then: JWT検証が呼び出された
      expect(mockVerifyFn).toHaveBeenCalledWith('valid-token');

      // RLS設定が呼び出された
      expect(mockRlsHelper.setCurrentUser).toHaveBeenCalledWith(mockDb, userId);

      // コンテキストにuserIdが設定された
      expect(mockContext.set).toHaveBeenCalledWith('userId', userId);

      // next()が呼び出された
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('RLS設定エラー', () => {
    test('RLS設定失敗時に500エラーを返す', async () => {
      // Given: 有効なJWTだがRLS設定に失敗
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockContext = createMockContext(
        {
          Authorization: 'Bearer valid-token',
        },
        { db: mockDb },
      );

      const mockVerifyFn = mock(
        async (): Promise<JwtVerificationResult> => ({
          valid: true,
          payload: {
            sub: userId,
            email: 'test@example.com',
            exp: Date.now() / 1000 + 3600,
            iat: Date.now() / 1000,
            iss: 'https://example.supabase.co/auth/v1',
            user_metadata: { name: 'Test User' },
            app_metadata: { provider: 'google' },
          },
        }),
      );

      const mockRlsSetUser = mock(async () => {
        throw new Error('Database connection failed');
      });

      // When: authMiddleware実行
      const response = await authMiddleware(
        mockContext,
        mockNext,
        mockVerifyFn,
        mockRlsSetUser,
      );

      // Then: 500エラー
      expect(response).toBeDefined();
      const json = await response?.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
      expect(response?.status).toBe(500);

      // next()は呼び出されない
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
