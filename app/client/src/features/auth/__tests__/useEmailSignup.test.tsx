import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useEmailSignup } from '@/features/auth/hooks/useEmailSignup';
import { AuthServicesProvider } from '@/features/auth/services/AuthServicesContext';
import type {
  AuthServiceInterface,
  SignupResult,
} from '@/features/auth/services/authService';

function createMockAuthService(
  overrides?: Partial<AuthServiceInterface>,
): AuthServiceInterface {
  return {
    signInWithOAuth: mock(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    signInWithEmailPassword: mock(async () => ({
      success: false as const,
      errorMessage: '呼ばれない',
    })),
    verifySession: mock(async () => {
      throw new Error('呼ばれない');
    }),
    signup: mock(
      async (): Promise<SignupResult> => ({
        status: 'pending_confirmation',
      }),
    ),
    ...overrides,
  } satisfies AuthServiceInterface;
}

describe('useEmailSignup', () => {
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    mockAuthService = createMockAuthService();
  });

  afterEach(() => {
    mock.restore();
    mock.clearAllMocks();
  });

  function buildWrapper() {
    const authService = mockAuthService;
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <AuthServicesProvider services={{ authService }}>
          {children}
        </AuthServicesProvider>
      );
    };
  }

  test('POST /api/auth/email/signup が 201 → status が pending_confirmation になる', async () => {
    // Given: signup が成功レスポンスを返す
    mockAuthService.signup = mock(
      async (): Promise<SignupResult> => ({
        status: 'pending_confirmation',
      }),
    );

    // When: signup を呼び出す
    const { result } = renderHook(() => useEmailSignup(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signup('test@example.com', 'Password1!');
    });

    // Then: status が pending_confirmation になる
    expect(result.current.status).toBe('pending_confirmation');
    expect(result.current.errorMessage).toBeNull();
  });

  test('409 EMAIL_ALREADY_REGISTERED_GOOGLE → status が error でREQ-302 案内文が設定される（AC-05）', async () => {
    // Given: Google 登録済みメール衝突エラー
    const expectedMessage =
      'このメールアドレスは Google アカウントで登録済みです。' +
      'Google でログインしてください。';
    mockAuthService.signup = mock(
      async (): Promise<SignupResult> => ({
        status: 'error',
        errorMessage: expectedMessage,
      }),
    );

    // When: signup を呼び出す
    const { result } = renderHook(() => useEmailSignup(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signup('google@example.com', 'Password1!');
    });

    // Then: error status と REQ-302 案内文が設定される
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe(expectedMessage);
    expect(result.current.errorMessage).toContain('Google');
  });

  test('409 EMAIL_ALREADY_REGISTERED → status が error でメッセージが設定される', async () => {
    // Given: メール登録済みエラー
    const expectedMessage = 'このメールアドレスは既に登録されています';
    mockAuthService.signup = mock(
      async (): Promise<SignupResult> => ({
        status: 'error',
        errorMessage: expectedMessage,
      }),
    );

    // When: signup を呼び出す
    const { result } = renderHook(() => useEmailSignup(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signup('existing@example.com', 'Password1!');
    });

    // Then: error status と登録済みメッセージが設定される
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe(expectedMessage);
  });

  test('400 VALIDATION_ERROR → status が error でメッセージが設定される', async () => {
    // Given: バリデーションエラー
    const expectedMessage = 'メールアドレスの形式が正しくありません';
    mockAuthService.signup = mock(
      async (): Promise<SignupResult> => ({
        status: 'error',
        errorMessage: expectedMessage,
      }),
    );

    // When: signup を呼び出す
    const { result } = renderHook(() => useEmailSignup(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signup('invalid-email', 'Password1!');
    });

    // Then: error status とバリデーションエラーメッセージが設定される
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe(expectedMessage);
  });

  test('送信中は isLoading が true になる', async () => {
    // Given: 解決を制御できる Promise
    let resolveSignup!: (value: SignupResult) => void;
    const pendingPromise = new Promise<SignupResult>((resolve) => {
      resolveSignup = resolve;
    });

    mockAuthService.signup = mock(() => pendingPromise);

    // When: signup を呼び出す（完了を待たない）
    const { result } = renderHook(() => useEmailSignup(), {
      wrapper: buildWrapper(),
    });

    act(() => {
      void result.current.signup('test@example.com', 'Password1!');
    });

    // Then: isLoading が true になる
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });
    expect(result.current.status).toBe('loading');

    // Cleanup: Promise を解決する
    await act(async () => {
      resolveSignup({ status: 'pending_confirmation' });
    });

    // Then: isLoading が false に戻る
    expect(result.current.isLoading).toBe(false);
  });

  test('signup が例外を throw した場合 isLoading が false になりフォールバックエラーが設定される', async () => {
    // Given: signup が例外を throw する
    mockAuthService.signup = mock(async (): Promise<SignupResult> => {
      throw new Error('ネットワークエラー');
    });

    // When: signup を呼び出す
    const { result } = renderHook(() => useEmailSignup(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.signup('test@example.com', 'Password1!');
    });

    // Then: isLoading が false に戻りエラー状態になる
    expect(result.current.isLoading).toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBeTruthy();
  });
});
