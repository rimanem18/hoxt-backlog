import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { usePasswordReset } from '@/features/auth/hooks/usePasswordReset';
import { AuthServicesProvider } from '@/features/auth/services/AuthServicesContext';
import type {
  AuthServiceInterface,
  UpdatePasswordResult,
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
    requestPasswordReset: mock(async () => {
      throw new Error('呼ばれない');
    }),
    onAuthStateChange: mock(() => () => {}),
    updatePassword: mock(
      async (): Promise<UpdatePasswordResult> => ({ status: 'success' }),
    ),
    ...overrides,
  } satisfies AuthServiceInterface;
}

describe('usePasswordReset', () => {
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  let capturedCallback: ((event: AuthChangeEvent) => void) | null;
  let unsubscribeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    capturedCallback = null;
    unsubscribeMock = mock(() => {});
    mockAuthService = createMockAuthService({
      onAuthStateChange: mock((callback: (event: AuthChangeEvent) => void) => {
        capturedCallback = callback;
        return unsubscribeMock;
      }),
    });
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

  test('PASSWORD_RECOVERY イベント受信 → isReady が true になる（REQ-105）', () => {
    // Given: usePasswordReset をレンダリング
    const { result } = renderHook(() => usePasswordReset(), {
      wrapper: buildWrapper(),
    });
    expect(result.current.isReady).toBe(false);

    // When: PASSWORD_RECOVERY イベントを受信
    act(() => {
      capturedCallback?.('PASSWORD_RECOVERY');
    });

    // Then: isReady が true になる
    expect(result.current.isReady).toBe(true);
  });

  test('PASSWORD_RECOVERY 以外のイベントでは isReady が変わらない（境界値）', () => {
    // Given: usePasswordReset をレンダリング
    const { result } = renderHook(() => usePasswordReset(), {
      wrapper: buildWrapper(),
    });

    // When: SIGNED_IN イベントを受信
    act(() => {
      capturedCallback?.('SIGNED_IN');
    });

    // Then: isReady は false のまま
    expect(result.current.isReady).toBe(false);
  });

  test('updatePassword 呼び出し成功 → status が success になる（REQ-105）', async () => {
    // Given: updatePassword が成功レスポンスを返す
    mockAuthService.updatePassword = mock(
      async (): Promise<UpdatePasswordResult> => ({ status: 'success' }),
    );

    // When: updatePassword を実行
    const { result } = renderHook(() => usePasswordReset(), {
      wrapper: buildWrapper(),
    });
    await act(async () => {
      await result.current.updatePassword('newPassword123');
    });

    // Then: status が success になる
    expect(result.current.status).toBe('success');
    expect(result.current.errorMessage).toBeNull();
  });

  test('updatePassword が otp_expired エラー → status が error でメッセージが設定される（REQ-305）', async () => {
    // Given: updatePassword がリンク無効エラーを返す
    const expectedMessage =
      'リンクが無効か期限切れです。再度パスワードリセットを要求してください';
    mockAuthService.updatePassword = mock(
      async (): Promise<UpdatePasswordResult> => ({
        status: 'error',
        errorMessage: expectedMessage,
      }),
    );

    // When: updatePassword を実行
    const { result } = renderHook(() => usePasswordReset(), {
      wrapper: buildWrapper(),
    });
    await act(async () => {
      await result.current.updatePassword('newPassword123');
    });

    // Then: status が error でメッセージが設定される
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe(expectedMessage);
  });

  test('アンマウント時に onAuthStateChange のサブスクリプションが解除される', () => {
    // Given: usePasswordReset をレンダリング
    const { unmount } = renderHook(() => usePasswordReset(), {
      wrapper: buildWrapper(),
    });

    // When: アンマウントする
    unmount();

    // Then: unsubscribe が呼ばれる
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  describe('無効リンクでの到達時', () => {
    afterEach(() => {
      window.history.pushState({}, '', '/');
    });

    test('URLにerror_codeパラメータがある場合、isReadyを待たずにstatusがerrorになる（REQ-305）', () => {
      // Given: 無効・期限切れリンクのURLパラメータ
      window.history.pushState(
        {},
        '',
        '/auth/reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      );

      // When: usePasswordReset をレンダリング
      const { result } = renderHook(() => usePasswordReset(), {
        wrapper: buildWrapper(),
      });

      // Then: isReady を待たずに status が error になる
      expect(result.current.isReady).toBe(false);
      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toBe(
        'リンクが無効か期限切れです。再度パスワードリセットを要求してください',
      );
    });

    test('URLにerror_codeパラメータがない場合はstatusが変わらない', () => {
      // Given: エラーパラメータなしのURL
      window.history.pushState({}, '', '/auth/reset-password');

      // When: usePasswordReset をレンダリング
      const { result } = renderHook(() => usePasswordReset(), {
        wrapper: buildWrapper(),
      });

      // Then: status は idle のまま
      expect(result.current.status).toBe('idle');
    });
  });
});
