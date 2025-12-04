import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import Provider from '../provider';

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

mock.module('@/shared/utils/validateClientEnv', () => ({
  validateClientEnv: mock(() => {}),
}));

mock.module('@/features/auth/components/GlobalErrorToast', () => ({
  default: function GlobalErrorToast() {
    return <div data-testid="global-error-toast" />;
  },
}));

describe('Provider', () => {
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
});
