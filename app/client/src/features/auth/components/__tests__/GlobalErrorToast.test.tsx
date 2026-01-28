import { beforeEach, describe, expect, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import authReducer from '@/features/auth/store/authSlice';
import errorReducer from '@/features/auth/store/errorSlice';
import GlobalErrorToast from '../GlobalErrorToast';

describe('GlobalErrorToast', () => {
  beforeEach(() => {
    // テストごとに新しいストアを作成
  });

  test('エラーがない場合は何も表示されない', () => {
    // Given: エラーなしの状態
    const store = configureStore({
      reducer: {
        auth: authReducer,
        error: errorReducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          isAuthRestoring: false,
          error: null,
          authError: null,
        },
        error: {
          isVisible: false,
          message: null,
          type: null,
        },
      },
    });

    // When: コンポーネントをレンダリング
    const { container } = render(
      <Provider store={store}>
        <GlobalErrorToast />
      </Provider>,
    );

    // Then: 何も表示されない
    expect(container.firstChild).toBeNull();
  });

  test('認証エラー(EXPIRED)が存在する場合に黄色のトーストが表示される', () => {
    // Given: 認証エラーが存在する状態
    const store = configureStore({
      reducer: {
        auth: authReducer,
        error: errorReducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          isAuthRestoring: false,
          error: null,
          authError: {
            code: 'EXPIRED',
            message: 'セッションの有効期限が切れました',
            timestamp: new Date().toISOString(),
          },
        },
        error: {
          isVisible: false,
          message: null,
          type: null,
        },
      },
    });

    // When: コンポーネントをレンダリング
    render(
      <Provider store={store}>
        <GlobalErrorToast />
      </Provider>,
    );

    // Then: 黄色のトースト（bg-yellow-500）が表示される
    const toast = screen.getByRole('alert');
    expect(toast).toBeDefined();
    expect(toast.className).toContain('bg-yellow-500');

    // Then: セッション期限切れメッセージが表示される
    expect(screen.getByText('セッション期限切れ')).toBeDefined();
    expect(screen.getByText('セッションの有効期限が切れました')).toBeDefined();
    expect(screen.getByText('再度ログインしてください')).toBeDefined();
  });

  test('通常のネットワークエラーが存在する場合に赤色のトーストが表示される', () => {
    // Given: ネットワークエラーが存在する状態
    const store = configureStore({
      reducer: {
        auth: authReducer,
        error: errorReducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: null,
          isLoading: false,
          isAuthRestoring: false,
          error: null,
          authError: null,
        },
        error: {
          isVisible: true,
          message: 'ネットワーク接続に失敗しました',
          type: 'network' as const,
        },
      },
    });

    // When: コンポーネントをレンダリング
    render(
      <Provider store={store}>
        <GlobalErrorToast />
      </Provider>,
    );

    // Then: 赤色のトースト（bg-red-500）が表示される
    const alerts = screen.getAllByRole('alert');
    const networkAlert = alerts.find((alert) =>
      alert.className.includes('bg-red-500'),
    );
    expect(networkAlert).toBeDefined();

    // Then: ネットワークエラーメッセージが表示される
    expect(screen.getByText('ネットワークエラー')).toBeDefined();
    expect(screen.getByText('ネットワーク接続に失敗しました')).toBeDefined();
  });

  test('認証エラーと通常エラーが同時に存在する場合に両方のトーストが表示される', () => {
    // Given: 認証エラーとネットワークエラーが両方存在する状態
    const store = configureStore({
      reducer: {
        auth: authReducer,
        error: errorReducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          isAuthRestoring: false,
          error: null,
          authError: {
            code: 'EXPIRED',
            message: 'セッションの有効期限が切れました',
            timestamp: new Date().toISOString(),
          },
        },
        error: {
          isVisible: true,
          message: 'ネットワーク接続に失敗しました',
          type: 'network' as const,
        },
      },
    });

    // When: コンポーネントをレンダリング
    render(
      <Provider store={store}>
        <GlobalErrorToast />
      </Provider>,
    );

    // Then: 両方のトーストが表示される（最低2つ以上の alert が存在）
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(2);

    // Then: 黄色のトースト（認証エラー）が存在
    const authAlert = alerts.find((alert) =>
      alert.className.includes('bg-yellow-500'),
    );
    expect(authAlert).toBeDefined();

    // Then: 赤色のトースト（ネットワークエラー）が存在
    const networkAlert = alerts.find((alert) =>
      alert.className.includes('bg-red-500'),
    );
    expect(networkAlert).toBeDefined();
  });

  test('認証エラーの code が EXPIRED でない場合は認証エラートーストは表示されない', () => {
    // Given: 認証エラーがあるが code が EXPIRED でない状態
    const store = configureStore({
      reducer: {
        auth: authReducer,
        error: errorReducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          isAuthRestoring: false,
          error: null,
          authError: {
            code: 'INVALID',
            message: '不正なトークンです',
            timestamp: new Date().toISOString(),
          },
        },
        error: {
          isVisible: false,
          message: null,
          type: null,
        },
      },
    });

    // When: コンポーネントをレンダリング
    const { container } = render(
      <Provider store={store}>
        <GlobalErrorToast />
      </Provider>,
    );

    // Then: 何も表示されない
    expect(container.firstChild).toBeNull();
  });
});
