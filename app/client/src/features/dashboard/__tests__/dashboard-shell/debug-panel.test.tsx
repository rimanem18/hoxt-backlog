import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  buildAuthState,
  buildUser,
  renderDashboardShell,
} from '../helpers/renderDashboardShell';

describe('DashboardShell 開発環境デバッグパネル', () => {
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

  test('開発環境の場合、デバッグパネルが表示される', () => {
    // Given: 開発環境・認証済みユーザー
    process.env.NODE_ENV = 'development';
    const authState = buildAuthState({ user: buildUser() });

    // When: DashboardShellをレンダリング
    renderDashboardShell({ authState });

    // Then: デバッグパネルが表示される
    expect(screen.getByText('開発情報:')).toBeInTheDocument();
  });

  test('本番環境の場合、デバッグパネルが表示されない', () => {
    // Given: 本番環境・認証済みユーザー
    process.env.NODE_ENV = 'production';
    const authState = buildAuthState({ user: buildUser() });

    // When: DashboardShellをレンダリング
    renderDashboardShell({ authState });

    // Then: デバッグパネルが表示されない
    expect(screen.queryByText('開発情報:')).not.toBeInTheDocument();
  });
});
