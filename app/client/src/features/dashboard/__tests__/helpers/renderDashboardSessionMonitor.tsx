import { mock } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider as ReduxProvider } from 'react-redux';
import authReducer, { type AuthState } from '@/features/auth/store/authSlice';
import errorReducer from '@/features/auth/store/errorSlice';
import { DashboardSessionMonitor } from '@/features/dashboard/components/DashboardSessionMonitor';
import {
  type DashboardServices,
  DashboardServicesProvider,
} from '@/features/dashboard/lib/DashboardServicesContext';
import { buildAuthState } from './authTestBuilders';

export { buildAuthState, buildUser } from './authTestBuilders';

export function buildDashboardServices(
  overrides: Partial<DashboardServices> = {},
): DashboardServices {
  return {
    fetchUserStatus: mock(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    ),
    ...overrides,
  };
}

interface RenderDashboardSessionMonitorOptions {
  authState?: AuthState;
  dashboardServices?: DashboardServices;
}

/**
 * DashboardSessionMonitor を Redux / DashboardServices の各Providerで
 * ラップしてレンダリングするテスト用ヘルパー
 */
export function renderDashboardSessionMonitor(
  options: RenderDashboardSessionMonitorOptions = {},
) {
  const store = configureStore({
    reducer: { auth: authReducer, error: errorReducer },
    preloadedState: { auth: options.authState ?? buildAuthState() },
  });

  const dashboardServices =
    options.dashboardServices ?? buildDashboardServices();

  const utils = render(
    <ReduxProvider store={store}>
      <DashboardServicesProvider services={dashboardServices}>
        <DashboardSessionMonitor />
      </DashboardServicesProvider>
    </ReduxProvider>,
  );

  return { store, ...utils };
}
