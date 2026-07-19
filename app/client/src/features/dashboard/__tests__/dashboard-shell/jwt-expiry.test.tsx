import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getSupabaseStorageKey } from '@/shared/utils/authValidation';
import {
  buildAuthState,
  buildUser,
  renderDashboardShell,
} from '../helpers/renderDashboardShell';

describe('DashboardShell JWT期限切れ監視', () => {
  afterEach(() => {
    localStorage.clear();
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('期限切れトークンの場合、認証状態が失効する', async () => {
    // Given: 期限切れのSupabase認証データ
    const expiresAt = Math.floor(Date.now() / 1000) - 100;
    localStorage.setItem(
      getSupabaseStorageKey(),
      JSON.stringify({ expires_at: expiresAt }),
    );
    const authState = buildAuthState({ user: buildUser() });

    // When: DashboardShellをレンダリング
    const { store } = renderDashboardShell({ authState });

    // Then: 認証状態が失効する
    await waitFor(() => {
      expect(store.getState().auth.authError?.code).toBe('EXPIRED');
    });
    expect(store.getState().auth.user).toBeNull();
  });

  test('有効なトークンの場合、認証状態が失効しない', async () => {
    // Given: 有効期限内のSupabase認証データ
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(
      getSupabaseStorageKey(),
      JSON.stringify({ expires_at: expiresAt }),
    );
    const authState = buildAuthState({ user: buildUser() });

    // When: DashboardShellをレンダリング
    const { store } = renderDashboardShell({ authState });

    // Then: 認証状態が失効しない
    await waitFor(() => {
      expect(store.getState().auth.user).not.toBeNull();
    });
    expect(store.getState().auth.authError).toBeNull();
  });

  test('不正なJSONの認証データの場合、認証状態が失効する', async () => {
    // Given: 破損した認証データ
    localStorage.setItem(getSupabaseStorageKey(), 'not-json');
    const authState = buildAuthState({ user: buildUser() });

    // When: DashboardShellをレンダリング
    const { store } = renderDashboardShell({ authState });

    // Then: 認証状態が失効する
    await waitFor(() => {
      expect(store.getState().auth.authError?.code).toBe('EXPIRED');
    });
  });
});
