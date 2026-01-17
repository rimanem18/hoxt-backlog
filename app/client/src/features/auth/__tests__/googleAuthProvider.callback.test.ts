import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GoogleAuthProvider } from '@/features/auth/services/providers/googleAuthProvider';
import { createMockJwt } from '@/testing/jwtFactory';

describe('GoogleAuthProvider - callback処理', () => {
  let mockSupabase: SupabaseClient;
  let googleProvider: GoogleAuthProvider;

  beforeEach(() => {
    // Supabase クライアントのモック
    mockSupabase = {
      auth: {
        setSession: mock(),
        getUser: mock(),
      },
    } as unknown as SupabaseClient;

    googleProvider = new GoogleAuthProvider(mockSupabase);
  });

  describe('validateToken', () => {
    it('モックトークンの場合は false を返す', () => {
      // Given: モックトークン
      const mockToken = 'mock_access_token';

      // When: トークン検証を実行
      const result = googleProvider.validateToken(mockToken);

      // Then: false が返される（Googleプロバイダーはモックを拒否）
      expect(result).toBe(false);
    });

    it('JWT形式のトークンの場合は true を返す', async () => {
      // Given: JWT形式のトークン（header.payload.signature）
      const jwtToken = await createMockJwt({ sub: '1234567890' });

      // When: トークン検証を実行
      const result = googleProvider.validateToken(jwtToken);

      // Then: true が返される
      expect(result).toBe(true);
    });

    it('空文字列の場合は false を返す', () => {
      // Given: 空文字列
      const emptyToken = '';

      // When: トークン検証を実行
      const result = googleProvider.validateToken(emptyToken);

      // Then: false が返される
      expect(result).toBe(false);
    });

    it('JWT形式でないトークンは false を返す', () => {
      // Given: JWT形式でないトークン
      const invalidToken = 'invalid-token-format';

      // When: トークン検証を実行
      const result = googleProvider.validateToken(invalidToken);

      // Then: false が返される
      expect(result).toBe(false);
    });
  });

  describe('handleCallback', () => {
    it('正常なトークンでコールバック処理が成功する', async () => {
      // Given: 正常なアクセストークンとリフレッシュトークン
      const hashParams = new URLSearchParams(
        'access_token=valid_token&refresh_token=valid_refresh_token',
      );

      // Given: Supabase がセッション確立に成功
      (
        mockSupabase.auth.setSession as ReturnType<typeof mock>
      ).mockResolvedValue({ error: null });

      // Given: ユーザー情報取得に成功
      (mockSupabase.auth.getUser as ReturnType<typeof mock>).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
              avatar_url: 'https://example.com/avatar.jpg',
            },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-27T00:00:00Z',
          },
        },
        error: null,
      });

      // Given: /auth/verify API がDBのUUIDを返す
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                user: {
                  id: 'test-user-id',
                  externalId: 'test-user-id',
                  provider: 'google',
                  email: 'test@example.com',
                  name: 'Test User',
                  avatarUrl: 'https://example.com/avatar.jpg',
                  createdAt: '2025-01-01T00:00:00Z',
                  updatedAt: '2025-01-27T00:00:00Z',
                  lastLoginAt: '2025-01-27T10:00:00Z',
                },
                isNewUser: false,
              },
            }),
        }),
      ) as typeof global.fetch;

      // When: コールバック処理を実行
      const result = await googleProvider.handleCallback(hashParams);

      // Then: 成功結果とユーザー情報が返される
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('test-user-id');
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.name).toBe('Test User');
      expect(result.user?.provider).toBe('google');
      expect(result.isNewUser).toBe(false);

      // Then: Supabase のメソッドが呼ばれている
      expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'valid_token',
        refresh_token: 'valid_refresh_token',
      });
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('アクセストークンが存在しない場合はエラーが発生する', async () => {
      // Given: トークンなしのパラメータ
      const hashParams = new URLSearchParams('error=some_error');

      // When & Then: エラーが発生（error パラメータがそのまま返される）
      await expect(googleProvider.handleCallback(hashParams)).rejects.toThrow(
        'some_error',
      );
    });

    it('ユーザーがキャンセルした場合は success: false を返す', async () => {
      // Given: access_denied エラー
      const hashParams = new URLSearchParams('error=access_denied');

      // When: コールバック処理を実行
      const result = await googleProvider.handleCallback(hashParams);

      // Then: 失敗結果が返される（エラーは発生しない）
      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.isNewUser).toBe(false);
    });

    it('Supabase セッション確立エラー時は例外が発生する', async () => {
      // Given: 正常なトークン
      const hashParams = new URLSearchParams('access_token=valid_token');

      // Given: Supabase がセッション確立に失敗
      (
        mockSupabase.auth.setSession as ReturnType<typeof mock>
      ).mockResolvedValue({
        error: { message: 'Session creation failed' },
      });

      // When & Then: エラーが発生
      await expect(googleProvider.handleCallback(hashParams)).rejects.toThrow(
        'Supabaseセッション確立エラー',
      );
    });

    it('ユーザー情報取得エラー時は例外が発生する', async () => {
      // Given: 正常なトークンとセッション確立成功
      const hashParams = new URLSearchParams('access_token=valid_token');
      (
        mockSupabase.auth.setSession as ReturnType<typeof mock>
      ).mockResolvedValue({ error: null });

      // Given: ユーザー情報取得に失敗
      (mockSupabase.auth.getUser as ReturnType<typeof mock>).mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found' },
      });

      // When & Then: エラーが発生
      await expect(googleProvider.handleCallback(hashParams)).rejects.toThrow(
        'ユーザー情報取得エラー',
      );
    });

    it('リフレッシュトークンがない場合でも処理が成功する', async () => {
      // Given: アクセストークンのみ（リフレッシュトークンなし）
      const hashParams = new URLSearchParams('access_token=valid_token');

      // Given: Supabase がセッション確立に成功
      (
        mockSupabase.auth.setSession as ReturnType<typeof mock>
      ).mockResolvedValue({ error: null });

      // Given: ユーザー情報取得に成功
      (mockSupabase.auth.getUser as ReturnType<typeof mock>).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-27T00:00:00Z',
          },
        },
        error: null,
      });

      // Given: /auth/verify API がDBのUUIDを返す
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                user: {
                  id: 'test-user-id',
                  externalId: 'test-user-id',
                  provider: 'google',
                  email: 'test@example.com',
                  name: 'Test User',
                  avatarUrl: null,
                  createdAt: '2025-01-01T00:00:00Z',
                  updatedAt: '2025-01-27T00:00:00Z',
                  lastLoginAt: null,
                },
                isNewUser: false,
              },
            }),
        }),
      ) as typeof global.fetch;

      // When: コールバック処理を実行
      const result = await googleProvider.handleCallback(hashParams);

      // Then: 成功結果が返される
      expect(result.success).toBe(true);

      // Then: リフレッシュトークンは空文字列で呼ばれる
      expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'valid_token',
        refresh_token: '',
      });
    });
  });

  describe('handleCallback with /auth/verify API call', () => {
    it('/auth/verify を呼び出し、DB の user.id を取得する', async () => {
      // Given: 正常なアクセストークン
      const hashParams = new URLSearchParams('access_token=valid_jwt_token');

      // Given: Supabase がセッション確立に成功
      (
        mockSupabase.auth.setSession as ReturnType<typeof mock>
      ).mockResolvedValue({ error: null });

      // Given: Supabase ユーザー情報取得に成功
      (mockSupabase.auth.getUser as ReturnType<typeof mock>).mockResolvedValue({
        data: {
          user: {
            id: 'supabase-external-id',
            email: 'backend-test@example.com',
            user_metadata: {
              full_name: 'Backend Test User',
            },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-27T00:00:00Z',
          },
        },
        error: null,
      });

      // Given: /auth/verify API がDBのUUIDを返す
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                user: {
                  id: 'db-uuid-from-backend-12345',
                  externalId: 'supabase-external-id',
                  provider: 'google',
                  email: 'backend-test@example.com',
                  name: 'Backend Test User',
                  avatarUrl: null,
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-01T00:00:00Z',
                  lastLoginAt: '2024-01-27T10:00:00Z',
                },
                isNewUser: false,
              },
            }),
        }),
      ) as typeof global.fetch;

      // When: コールバック処理を実行
      const result = await googleProvider.handleCallback(hashParams);

      // Then: 成功結果が返される
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();

      // Then: DB の UUID が user.id として返される（Supabase の外部ID ではない）
      expect(result.user?.id).toBe('db-uuid-from-backend-12345');
      expect(result.user?.externalId).toBe('supabase-external-id');
      expect(result.user?.provider).toBe('google');

      // Then: /auth/verify API が呼ばれた
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/verify'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('valid_jwt_token'),
        }),
      );
    });

    it('/auth/verify でエラー時、適切な例外をスロー', async () => {
      // Given: 正常なアクセストークン
      const hashParams = new URLSearchParams('access_token=valid_jwt_token');

      // Given: Supabase がセッション確立に成功
      (
        mockSupabase.auth.setSession as ReturnType<typeof mock>
      ).mockResolvedValue({ error: null });

      // Given: Supabase ユーザー情報取得に成功
      (mockSupabase.auth.getUser as ReturnType<typeof mock>).mockResolvedValue({
        data: {
          user: {
            id: 'supabase-external-id',
            email: 'error-test@example.com',
            user_metadata: { full_name: 'Error Test User' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-27T00:00:00Z',
          },
        },
        error: null,
      });

      // Given: /auth/verify API がエラーを返す
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              success: false,
              error: { message: 'Backend Server Error' },
            }),
        }),
      ) as typeof global.fetch;

      // When: コールバック処理を実行してエラーをキャッチ
      let thrownError: Error | undefined;
      try {
        await googleProvider.handleCallback(hashParams);
      } catch (error) {
        thrownError = error as Error;
      }

      // Then: エラーが発生し、バックエンドのエラー詳細を含む
      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toContain('バックエンド認証エラー');
      expect(thrownError?.message).toContain('Backend Server Error');
    });
  });
});
