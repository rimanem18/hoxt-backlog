import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { AuthServicesProvider } from '@/features/auth/services/AuthServicesContext';
import authReducer, { type AuthState } from '@/features/auth/store/authSlice';
import type { User } from '@/packages/shared-schemas/src/auth';
import { HomeAuthShell } from '../components/HomeAuthShell';
import { HomeShellServicesProvider } from '../components/HomeShellServicesContext';
import { LoginPageHeader } from '../components/LoginPageHeader';

const DUMMY_USER: User = {
  id: '11111111-1111-1111-1111-111111111111',
  externalId: 'external-id',
  provider: 'google',
  email: 'test@example.com',
  name: 'テストユーザー',
  avatarUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: null,
};

function buildAuthState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    isAuthRestoring: false,
    error: null,
    authError: null,
    ...overrides,
  };
}

function renderHomeAuthShell(
  authState: AuthState,
  navigate: (path: string) => void,
  children: ReactNode = <div>SENTINEL_CHILD</div>,
) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <ReduxProvider store={store}>
      <AuthServicesProvider>
        <HomeShellServicesProvider services={{ navigate }}>
          <HomeAuthShell>{children}</HomeAuthShell>
        </HomeShellServicesProvider>
      </AuthServicesProvider>
    </ReduxProvider>,
  );
}

describe('LoginPageHeader', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('見出しと説明文が表示される', () => {
    // Given/When: 静的な見出しコンポーネントをレンダリング
    render(<LoginPageHeader />);

    // Then: 見出しと説明文が表示される
    expect(
      screen.getByRole('heading', { name: 'アカウントでログイン' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'メールアドレスまたは Google アカウントでログインしてください。',
      ),
    ).toBeInTheDocument();
  });
});

describe('HomeAuthShell', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('認証状態復元中はローディング表示のみでchildrenが表示されない', () => {
    // Given: 認証状態復元中の状態
    const mockNavigate = mock(() => {});
    const authState = buildAuthState({ isAuthRestoring: true });

    // When: HomeAuthShellをレンダリング
    renderHomeAuthShell(authState, mockNavigate);

    // Then: ローディング表示のみでchildrenは表示されない
    expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
    expect(screen.queryByText('SENTINEL_CHILD')).not.toBeInTheDocument();
  });

  test('復元完了・認証済みの場合にダッシュボードへnavigateされる', async () => {
    // Given: 復元完了・認証済みの状態
    const mockNavigate = mock(() => {});
    const authState = buildAuthState({
      isAuthRestoring: false,
      isAuthenticated: true,
      user: DUMMY_USER,
    });

    // When: HomeAuthShellをレンダリング
    renderHomeAuthShell(authState, mockNavigate);

    // Then: /dashboardへnavigateされる
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('authError.codeがEXPIREDの場合にエラーバナーが表示される', () => {
    // Given: JWT期限切れの認証エラー状態
    const mockNavigate = mock(() => {});
    const authState = buildAuthState({
      authError: {
        code: 'EXPIRED',
        message: 'セッションの有効期限が切れました',
        timestamp: Date.now(),
      },
    });

    // When: HomeAuthShellをレンダリング
    renderHomeAuthShell(authState, mockNavigate);

    // Then: エラーバナーが表示される
    expect(screen.getByText('認証に問題があります')).toBeInTheDocument();
    expect(
      screen.getByText('セッションの有効期限が切れました'),
    ).toBeInTheDocument();
    expect(screen.getByText('再度ログインしてください')).toBeInTheDocument();
  });

  test('authErrorがEXPIRED以外の場合にエラーバナーが表示されない', () => {
    // Given: EXPIRED以外の認証エラー状態
    const mockNavigate = mock(() => {});
    const authState = buildAuthState({
      authError: {
        code: 'UNAUTHORIZED',
        message: '不正なトークンです',
        timestamp: Date.now(),
      },
    });

    // When: HomeAuthShellをレンダリング
    renderHomeAuthShell(authState, mockNavigate);

    // Then: エラーバナーは表示されない
    expect(screen.queryByText('認証に問題があります')).not.toBeInTheDocument();
  });

  test('childrenが正しい位置に描画される', () => {
    // Given: 未認証・復元完了の状態
    const mockNavigate = mock(() => {});
    const authState = buildAuthState();

    // When: HomeAuthShellをレンダリング
    renderHomeAuthShell(authState, mockNavigate);

    // Then: childrenが表示される
    expect(screen.getByText('SENTINEL_CHILD')).toBeInTheDocument();
  });

  test('開発環境の場合に開発情報が表示される', () => {
    // Given: 開発環境・未認証・復元完了の状態
    process.env.NODE_ENV = 'development';
    const mockNavigate = mock(() => {});
    const authState = buildAuthState();

    // When: HomeAuthShellをレンダリング
    renderHomeAuthShell(authState, mockNavigate);

    // Then: 開発情報が表示される
    expect(screen.getByText('開発情報:')).toBeInTheDocument();
  });

  test('本番環境の場合に開発情報が表示されない', () => {
    // Given: 本番環境・未認証・復元完了の状態
    process.env.NODE_ENV = 'production';
    const mockNavigate = mock(() => {});
    const authState = buildAuthState();

    // When: HomeAuthShellをレンダリング
    renderHomeAuthShell(authState, mockNavigate);

    // Then: 開発情報は表示されない
    expect(screen.queryByText('開発情報:')).not.toBeInTheDocument();
  });
});
