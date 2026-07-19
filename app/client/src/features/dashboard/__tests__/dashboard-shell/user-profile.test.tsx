import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  buildAuthState,
  buildUser,
  renderDashboardShell,
} from '../helpers/renderDashboardShell';

describe('DashboardShell ユーザープロフィール表示', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('userが存在する場合、UserProfileが表示される', () => {
    // Given: 認証済みユーザー
    const user = buildUser({ name: '通知太郎' });
    const authState = buildAuthState({ user });

    // When: DashboardShellをレンダリング
    renderDashboardShell({ authState });

    // Then: ユーザー名が表示される
    expect(screen.getByText('通知太郎')).toBeInTheDocument();
  });

  test('userがnullの場合、UserProfileが表示されない', () => {
    // Given: 未認証状態
    const authState = buildAuthState({ user: null });

    // When: DashboardShellをレンダリング
    renderDashboardShell({ authState });

    // Then: UserProfile固有の要素（ログアウトボタン）が表示されない
    expect(
      screen.queryByRole('button', { name: 'ログアウト' }),
    ).not.toBeInTheDocument();
  });
});
