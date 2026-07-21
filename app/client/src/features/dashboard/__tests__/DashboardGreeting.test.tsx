import { afterEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider as ReduxProvider } from 'react-redux';
import authReducer from '@/features/auth/store/authSlice';
import { DashboardGreeting } from '@/features/dashboard/components/DashboardGreeting';
import { buildAuthState, buildUser } from './helpers/renderDashboardShell';

describe('DashboardGreeting 挨拶メッセージ', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('lastLoginAtがない場合、ようこそメッセージが表示される', () => {
    // Given: 初回ログイン相当のユーザー
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: buildAuthState({ user: buildUser({ lastLoginAt: null }) }),
      },
    });

    // When: DashboardGreetingをレンダリング
    render(
      <ReduxProvider store={store}>
        <DashboardGreeting />
      </ReduxProvider>,
    );

    // Then: ようこそメッセージが表示される
    expect(
      screen.getByText('ようこそ！タスク管理を始めましょう。'),
    ).toBeInTheDocument();
  });

  test('lastLoginAtがある場合、おかえりなさいメッセージが表示される', () => {
    // Given: 再訪ユーザー
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: buildAuthState({
          user: buildUser({ lastLoginAt: '2026-07-01T00:00:00.000Z' }),
        }),
      },
    });

    // When: DashboardGreetingをレンダリング
    render(
      <ReduxProvider store={store}>
        <DashboardGreeting />
      </ReduxProvider>,
    );

    // Then: おかえりなさいメッセージが表示される
    expect(
      screen.getByText('おかえりなさい！あなたのタスクを管理しましょう。'),
    ).toBeInTheDocument();
  });
});
