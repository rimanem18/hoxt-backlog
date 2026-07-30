import { afterEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider as ReduxProvider } from 'react-redux';
import authReducer, { type AuthState } from '@/features/auth/store/authSlice';
import { DashboardDebugInfo } from '../components/DashboardDebugInfo';
import { buildAuthState, buildUser } from './helpers/renderDashboardShell';

function renderDashboardDebugInfo(authState: AuthState) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <ReduxProvider store={store}>
      <DashboardDebugInfo />
    </ReduxProvider>,
  );
}

describe('DashboardDebugInfo', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('見出しと認証状態が表示される', () => {
    // Given: 認証済みユーザーの状態
    const authState = buildAuthState({ user: buildUser() });

    // When: DashboardDebugInfoをレンダリング
    renderDashboardDebugInfo(authState);

    // Then: 見出しと固定の認証状態文言が表示される
    expect(screen.getByText('開発情報:')).toBeInTheDocument();
    expect(
      screen.getByText('認証状態: 認証済み（AuthGuard保証）'),
    ).toBeInTheDocument();
  });

  test('ユーザーIDと最終ログインが未設定の場合に未設定と表示される', () => {
    // Given: lastLoginAtがnullのユーザー
    const authState = buildAuthState({
      user: buildUser({ lastLoginAt: null }),
    });

    // When: DashboardDebugInfoをレンダリング
    renderDashboardDebugInfo(authState);

    // Then: ユーザーIDは設定済み・最終ログインは未設定と表示される
    expect(screen.getByText(/ユーザーID:/)).toHaveTextContent(
      'ユーザーID: 設定済み',
    );
    expect(screen.getByText(/最終ログイン:/)).toHaveTextContent(
      '最終ログイン: 未設定',
    );
  });

  test('最終ログイン日時がある場合に記録ありと表示される', () => {
    // Given: lastLoginAtが設定されたユーザー
    const authState = buildAuthState({
      user: buildUser({ lastLoginAt: '2026-01-01T00:00:00.000Z' }),
    });

    // When: DashboardDebugInfoをレンダリング
    renderDashboardDebugInfo(authState);

    // Then: 最終ログインは記録ありと表示される
    expect(screen.getByText(/最終ログイン:/)).toHaveTextContent(
      '最終ログイン: 記録あり',
    );
  });

  test('userがnullの場合にユーザーIDが未設定と表示される', () => {
    // Given: userがnullの状態
    const authState = buildAuthState({ user: null });

    // When: DashboardDebugInfoをレンダリング
    renderDashboardDebugInfo(authState);

    // Then: ユーザーIDは未設定と表示される
    expect(screen.getByText(/ユーザーID:/)).toHaveTextContent(
      'ユーザーID: 未設定',
    );
  });
});
