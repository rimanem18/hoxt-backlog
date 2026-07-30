import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  buildDashboardServices,
  renderDashboardShell,
} from '../helpers/renderDashboardShell';

describe('DashboardShell ネットワーク状態確認', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('ネットワークが正常な場合、ネットワークエラーが表示されない', async () => {
    // Given: 200 OKを返すネットワーク状態確認
    const dashboardServices = buildDashboardServices({
      fetchUserStatus: mock(() =>
        Promise.resolve(new Response(null, { status: 200 })),
      ),
    });

    // When: DashboardShellをレンダリング
    const { store } = renderDashboardShell({ dashboardServices });

    // Then: ネットワークエラーが表示されない
    await waitFor(() => {
      expect(dashboardServices.fetchUserStatus).toHaveBeenCalled();
    });
    expect(store.getState().error.isVisible).toBe(false);
  });

  test('fetchが例外を投げた場合、ネットワークエラーが表示される', async () => {
    // Given: fetch失敗を模した例外
    const dashboardServices = buildDashboardServices({
      fetchUserStatus: mock(() =>
        Promise.reject(new TypeError('Failed to fetch')),
      ),
    });

    // When: DashboardShellをレンダリング
    const { store } = renderDashboardShell({ dashboardServices });

    // Then: ネットワークエラーが表示される
    await waitFor(() => {
      expect(store.getState().error.isVisible).toBe(true);
    });
    expect(store.getState().error.type).toBe('network');
  });

  test('5xxレスポンスの場合、ネットワークエラーが表示される', async () => {
    // Given: サーバーエラー(500)を返すネットワーク状態確認
    const dashboardServices = buildDashboardServices({
      fetchUserStatus: mock(() =>
        Promise.resolve(new Response(null, { status: 500 })),
      ),
    });

    // When: DashboardShellをレンダリング
    const { store } = renderDashboardShell({ dashboardServices });

    // Then: ネットワークエラーが表示される
    await waitFor(() => {
      expect(store.getState().error.isVisible).toBe(true);
    });
  });
});
