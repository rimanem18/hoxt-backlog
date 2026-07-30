import { afterEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider as ReduxProvider } from 'react-redux';
import authReducer, { type AuthState } from '@/features/auth/store/authSlice';
import type { User } from '@/packages/shared-schemas/src/auth';
import { HomeAuthDebugInfo } from '../components/HomeAuthDebugInfo';

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

function renderHomeAuthDebugInfo(authState: AuthState) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <ReduxProvider store={store}>
      <HomeAuthDebugInfo />
    </ReduxProvider>,
  );
}

describe('HomeAuthDebugInfo', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('見出しが表示される', () => {
    // Given: 未認証の状態
    const authState = buildAuthState();

    // When: HomeAuthDebugInfoをレンダリング
    renderHomeAuthDebugInfo(authState);

    // Then: 見出しが表示される
    expect(screen.getByText('開発情報:')).toBeInTheDocument();
  });

  test('未認証の場合に未認証・ユーザー情報なしが表示される', () => {
    // Given: 未認証・ユーザー情報なしの状態
    const authState = buildAuthState({ isAuthenticated: false, user: null });

    // When: HomeAuthDebugInfoをレンダリング
    renderHomeAuthDebugInfo(authState);

    // Then: 未認証・ユーザー情報なしが表示される
    expect(screen.getByText(/認証状態:/)).toHaveTextContent('認証状態: 未認証');
    expect(screen.getByText(/ユーザー情報:/)).toHaveTextContent(
      'ユーザー情報: なし',
    );
  });

  test('認証済みの場合に認証済み・ユーザー情報が表示される', () => {
    // Given: 認証済み・ユーザー情報ありの状態
    const authState = buildAuthState({
      isAuthenticated: true,
      user: DUMMY_USER,
    });

    // When: HomeAuthDebugInfoをレンダリング
    renderHomeAuthDebugInfo(authState);

    // Then: 認証済み・ユーザー情報が表示される
    expect(screen.getByText(/認証状態:/)).toHaveTextContent(
      '認証状態: 認証済み（ダッシュボードへリダイレクト中）',
    );
    expect(screen.getByText(/ユーザー情報:/)).toHaveTextContent(
      'ユーザー情報: テストユーザー (test@example.com)',
    );
  });
});
