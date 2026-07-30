import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useForgotPassword } from '@/features/auth/hooks/useForgotPassword';
import { AuthServicesProvider } from '@/features/auth/services/AuthServicesContext';
import type {
  AuthServiceInterface,
  RequestPasswordResetResult,
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
    signup: mock(async () => {
      throw new Error('呼ばれない');
    }),
    requestPasswordReset: mock(
      async (): Promise<RequestPasswordResetResult> => ({
        status: 'sent',
      }),
    ),
    ...overrides,
  } satisfies AuthServiceInterface;
}

describe('useForgotPassword', () => {
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

  test('requestReset 成功 → status が sent になる（REQ-104）', async () => {
    // Given: requestPasswordReset が成功レスポンスを返す
    mockAuthService.requestPasswordReset = mock(
      async (): Promise<RequestPasswordResetResult> => ({
        status: 'sent',
      }),
    );

    // When: requestReset を呼び出す
    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.requestReset('test@example.com');
    });

    // Then: status が sent になる
    expect(result.current.status).toBe('sent');
    expect(result.current.errorMessage).toBeNull();
  });

  test('レート制限エラー → status が error でメッセージが設定される', async () => {
    // Given: レート制限エラーレスポンス
    const expectedMessage =
      'リクエストが多すぎます。しばらくしてから再度お試しください';
    mockAuthService.requestPasswordReset = mock(
      async (): Promise<RequestPasswordResetResult> => ({
        status: 'error',
        errorMessage: expectedMessage,
      }),
    );

    // When: requestReset を呼び出す
    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.requestReset('test@example.com');
    });

    // Then: status が error でメッセージが設定される
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe(expectedMessage);
  });

  test('送信中は isLoading が true になる', async () => {
    // Given: 解決を遅延させる requestPasswordReset
    let resolvePromise: (value: RequestPasswordResetResult) => void = () => {};
    mockAuthService.requestPasswordReset = mock(
      () =>
        new Promise<RequestPasswordResetResult>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    // When: requestReset を呼び出す
    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: buildWrapper(),
    });

    act(() => {
      void result.current.requestReset('test@example.com');
    });

    // Then: 送信中は isLoading が true になる
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolvePromise({ status: 'sent' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  test('redirectTo として window.location.origin + /auth/reset-password が渡される', async () => {
    // Given: requestPasswordReset の呼び出し引数を記録するモック
    const requestPasswordReset = mock(
      async (): Promise<RequestPasswordResetResult> => ({
        status: 'sent',
      }),
    );
    mockAuthService.requestPasswordReset = requestPasswordReset;

    // When: requestReset を呼び出す
    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: buildWrapper(),
    });

    await act(async () => {
      await result.current.requestReset('test@example.com');
    });

    // Then: redirectTo が正しく渡される
    expect(requestPasswordReset).toHaveBeenCalledWith(
      'test@example.com',
      `${window.location.origin}/auth/reset-password`,
    );
  });
});
