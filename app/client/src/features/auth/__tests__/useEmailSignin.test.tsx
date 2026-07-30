import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import type { Session } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { useEmailSignin } from '@/features/auth/hooks/useEmailSignin';
import { AuthServicesProvider } from '@/features/auth/services/AuthServicesContext';
import type { AuthServiceInterface } from '@/features/auth/services/authService';
import type { SignInResult } from '@/features/auth/services/providers/emailPasswordAuthProvider';
import { authSlice } from '@/features/auth/store/authSlice';
import type { User } from '@/packages/shared-schemas/src/auth';

const mockUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  externalId: 'email-user-001',
  provider: 'email',
  email: 'test@example.com',
  name: 'テストユーザー',
  avatarUrl: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  lastLoginAt: null,
};

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 9999999999,
  user: {
    id: 'supabase-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00.000Z',
  },
} as unknown as Session;

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
  });
}

function createMockAuthService(overrides?: Partial<AuthServiceInterface>) {
  return {
    signInWithOAuth: mock(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    signInWithEmailPassword: mock(
      async (_email: string, _password: string): Promise<SignInResult> => ({
        success: true,
        session: mockSession,
      }),
    ),
    verifySession: mock(
      async (_token: string): Promise<{ user: User; isNewUser: boolean }> => ({
        user: mockUser,
        isNewUser: false,
      }),
    ),
    ...overrides,
  } satisfies AuthServiceInterface;
}

describe('useEmailSignin', () => {
  let testStore: ReturnType<typeof createTestStore>;
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    testStore = createTestStore();
    mockAuthService = createMockAuthService();
  });

  afterEach(() => {
    mock.restore();
    mock.clearAllMocks();
  });

  function buildWrapper() {
    const store = testStore;
    const authService = mockAuthService;

    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <Provider store={store}>
          <AuthServicesProvider services={{ authService }}>
            {children}
          </AuthServicesProvider>
        </Provider>
      );
    };
  }

  test('サインイン成功 → authSuccess が dispatch される', async () => {
    // Given: signInWithEmailPassword が成功セッションを返す
    mockAuthService.signInWithEmailPassword = mock(
      async (): Promise<SignInResult> => ({
        success: true,
        session: mockSession,
      }),
    );
    mockAuthService.verifySession = mock(async () => ({
      user: mockUser,
      isNewUser: false,
    }));

    // When: signIn を呼び出す
    const { result } = renderHook(() => useEmailSignin(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    // Then: authSuccess が dispatch されて認証済み状態になる
    const state = testStore.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.error).toBeNull();
  });

  test('サインイン成功 → POST /api/auth/verify に access_token が渡される', async () => {
    // Given: 成功するモック
    mockAuthService.signInWithEmailPassword = mock(
      async (): Promise<SignInResult> => ({
        success: true,
        session: mockSession,
      }),
    );
    mockAuthService.verifySession = mock(async (token: string) => ({
      user: mockUser,
      isNewUser: false,
    }));

    // When: signIn を呼び出す
    const { result } = renderHook(() => useEmailSignin(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    // Then: verifySession に access_token が渡される
    expect(mockAuthService.verifySession).toHaveBeenCalledWith(
      mockSession.access_token,
    );
  });

  test('サインイン失敗（誤パスワード）→ authFailure が dispatch され errorMessage が設定される', async () => {
    // Given: invalid_grant エラー（REQ-301）
    const errorMessage = 'メールアドレスまたはパスワードが間違っています';
    mockAuthService.signInWithEmailPassword = mock(
      async (): Promise<SignInResult> => ({
        success: false,
        errorMessage,
      }),
    );

    // When: signIn を呼び出す
    const { result } = renderHook(() => useEmailSignin(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'wrongpassword');
    });

    // Then: authFailure が dispatch されエラーメッセージが設定される
    const state = testStore.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe(errorMessage);
    expect(result.current.errorMessage).toBe(errorMessage);
  });

  test('存在しないメールアドレス → パスワード不一致と同一メッセージになる（NFR-101）', async () => {
    // Given: 存在しないメールアドレスの場合も同じエラーメッセージ（NFR-101）
    const errorMessage = 'メールアドレスまたはパスワードが間違っています';
    mockAuthService.signInWithEmailPassword = mock(
      async (): Promise<SignInResult> => ({
        success: false,
        errorMessage,
      }),
    );

    // When: 存在しないメールアドレスでサインイン試行
    const { result } = renderHook(() => useEmailSignin(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signIn('nonexistent@example.com', 'somepassword');
    });

    // Then: 誤パスワードと同一のエラーメッセージが表示される
    expect(result.current.errorMessage).toBe(errorMessage);
  });

  test('未確認アカウント → authFailure が dispatch され確認促進メッセージが設定される（REQ-303）', async () => {
    // Given: email_not_confirmed エラー（REQ-303）
    const errorMessage =
      'メールアドレスの確認が必要です。受信したメール内のリンクから確認を完了してください';
    mockAuthService.signInWithEmailPassword = mock(
      async (): Promise<SignInResult> => ({
        success: false,
        errorMessage,
      }),
    );

    // When: 未確認アカウントでサインイン試行
    const { result } = renderHook(() => useEmailSignin(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signIn('unconfirmed@example.com', 'password123');
    });

    // Then: 確認促進メッセージが設定される
    const state = testStore.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(result.current.errorMessage).toBe(errorMessage);
    expect(result.current.errorMessage).toContain(
      'メールアドレスの確認が必要です',
    );
  });

  test('大文字メールアドレスのサインイン失敗 → 誤パスワードと区別されないメッセージになる（NFR-101）', async () => {
    // Given: 大文字を含むメールアドレス（NFR-101: メール存在有無を区別しない）
    const expectedMessage = 'メールアドレスまたはパスワードが間違っています';
    mockAuthService.signInWithEmailPassword = mock(
      async (): Promise<SignInResult> => ({
        success: false,
        errorMessage: expectedMessage,
      }),
    );

    // When: 大文字メールでサインイン試行
    const { result } = renderHook(() => useEmailSignin(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signIn('User@EXAMPLE.com', 'password123');
    });

    // Then: 誤パスワードと同一のエラーメッセージが返る（区別されない）
    expect(result.current.errorMessage).toBe(expectedMessage);
  });

  test('送信中は isLoading が true になること', async () => {
    // Given: 解決を制御できる Promise
    let resolveSignIn!: (value: SignInResult) => void;
    const pendingPromise = new Promise<SignInResult>((resolve) => {
      resolveSignIn = resolve;
    });

    mockAuthService.signInWithEmailPassword = mock(() => pendingPromise);

    // When: signIn を呼び出す（完了を待たない）
    const { result } = renderHook(() => useEmailSignin(), {
      wrapper: buildWrapper(),
    });

    act(() => {
      void result.current.signIn('test@example.com', 'password123');
    });

    // Then: isLoading が true になる
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Cleanup: Promise を解決する
    await act(async () => {
      resolveSignIn({
        success: false,
        errorMessage: 'メールアドレスまたはパスワードが間違っています',
      });
    });

    // Then: isLoading が false に戻る
    expect(result.current.isLoading).toBe(false);
  });

  test('verifySession が例外を throw した場合 isLoading が false になりフォールバックエラーが設定される', async () => {
    // Given: signIn 成功・verifySession で例外発生
    mockAuthService.signInWithEmailPassword = mock(
      async (): Promise<SignInResult> => ({
        success: true,
        session: mockSession,
      }),
    );
    mockAuthService.verifySession = mock(async () => {
      throw new Error('ネットワークエラー');
    });

    // When: signIn を呼び出す
    const { result } = renderHook(() => useEmailSignin(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    // Then: isLoading が false に戻りフォールバックメッセージが設定される
    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBe(
      'サインインに失敗しました。時間をおいて再度お試しください',
    );
    const state = testStore.getState().auth;
    expect(state.isAuthenticated).toBe(false);
  });
});
