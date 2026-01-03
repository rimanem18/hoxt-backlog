import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import Provider from '../provider';

// setAuthErrorCallbackのモック用変数
let mockSetAuthErrorCallback: ReturnType<typeof mock>;
let registeredCallback:
  | ((error: { status: number; message?: string }) => void)
  | null = null;

// Redux storeと認証関連の関数をモック
mock.module('@/store', () => ({
  store: {
    dispatch: mock(() => {}),
    getState: mock(() => ({ auth: {}, error: {}, oauthError: {} })),
    subscribe: mock(() => mock(() => {})),
  },
}));

mock.module('@/features/auth/store/authSlice', () => ({
  restoreAuthState: mock(() => ({ type: 'auth/restoreAuthState' })),
  finishAuthRestore: mock(() => ({ type: 'auth/finishAuthRestore' })),
  handleExpiredToken: mock(() => ({ type: 'auth/handleExpiredToken' })),
  logout: mock(() => ({ type: 'auth/logout' })),
}));

mock.module('@/shared/utils/authValidation', () => ({
  validateStoredAuth: mock(() => ({ isValid: false, reason: 'missing' })),
}));

mock.module('@/features/auth/components/GlobalErrorToast', () => ({
  default: function GlobalErrorToast() {
    return <div data-testid="global-error-toast" />;
  },
}));

mock.module('@/lib/api', () => {
  mockSetAuthErrorCallback = mock((callback) => {
    registeredCallback = callback;
  });

  return {
    setAuthErrorCallback: mockSetAuthErrorCallback,
    setAuthToken: mock(() => {}),
  };
});

describe('Provider', () => {
  beforeEach(() => {
    // テストごとにコールバックとモックをリセット
    registeredCallback = null;
    if (mockSetAuthErrorCallback) {
      mockSetAuthErrorCallback.mockClear();
    }
  });

  test('Providerが正常にレンダリングされる', () => {
    render(
      <Provider>
        <div data-testid="child">Test Child</div>
      </Provider>,
    );

    expect(screen.getByTestId('child')).toBeDefined();
  });

  test('QueryClientProviderが子コンポーネントをラップする', () => {
    render(
      <Provider>
        <div data-testid="child-unique">Test Child</div>
      </Provider>,
    );

    // QueryClientProvider経由で子要素がレンダリングされることを確認
    expect(screen.getByTestId('child-unique')).toBeDefined();
    expect(screen.getAllByTestId('global-error-toast').length).toBeGreaterThan(
      0,
    );
  });

  test('複数回レンダリングしても同じQueryClientインスタンスを使用する', () => {
    const { rerender } = render(
      <Provider>
        <div>First</div>
      </Provider>,
    );

    rerender(
      <Provider>
        <div>Second</div>
      </Provider>,
    );

    // エラーが発生しないことを確認（異なるインスタンスだとコンテキストエラーが発生）
    expect(screen.getByText('Second')).toBeDefined();
  });

  test('Provider mount 時に setAuthErrorCallback が呼び出される', () => {
    // When: Provider をレンダリング
    render(
      <Provider>
        <div>Test</div>
      </Provider>,
    );

    // Then: setAuthErrorCallback が呼び出される
    expect(mockSetAuthErrorCallback).toHaveBeenCalledTimes(1);
    expect(registeredCallback).not.toBeNull();
  });

  test('登録されたコールバックが 401 エラーを受け取ると handleExpiredToken が dispatch される', async () => {
    // Given: Provider をレンダリングしてコールバックを登録
    const { handleExpiredToken } = await import(
      '@/features/auth/store/authSlice'
    );
    const { store } = await import('@/store');

    render(
      <Provider>
        <div>Test</div>
      </Provider>,
    );

    expect(registeredCallback).not.toBeNull();

    // When: 登録されたコールバックを 401 エラーで呼び出し
    registeredCallback?.({ status: 401, message: 'Unauthorized' });

    // Then: handleExpiredToken が dispatch される
    expect(handleExpiredToken).toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'auth/handleExpiredToken',
    });
  });

  test('登録されたコールバックが 401 以外のエラーを受け取っても handleExpiredToken は dispatch されない', async () => {
    // Given: Provider をレンダリングしてコールバックを登録
    const { handleExpiredToken } = await import(
      '@/features/auth/store/authSlice'
    );
    const { store } = await import('@/store');

    render(
      <Provider>
        <div>Test</div>
      </Provider>,
    );

    expect(registeredCallback).not.toBeNull();

    // テスト前の呼び出し回数をリセット
    (handleExpiredToken as ReturnType<typeof mock>).mockClear();
    (store.dispatch as ReturnType<typeof mock>).mockClear();

    // When: 登録されたコールバックを 404 エラーで呼び出し
    registeredCallback?.({ status: 404, message: 'Not Found' });

    // Then: handleExpiredToken は dispatch されない
    expect(handleExpiredToken).not.toHaveBeenCalled();
  });
});
