import { mock } from 'bun:test';
import type { User } from '@hoxt-backlog/shared-schemas/auth';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import authReducer, { type AuthState } from '@/features/auth/store/authSlice';
import errorReducer from '@/features/auth/store/errorSlice';
import { DashboardShell } from '@/features/dashboard/components/DashboardShell';
import {
  type DashboardServices,
  DashboardServicesProvider,
} from '@/features/dashboard/lib/DashboardServicesContext';
import {
  type ProjectServices,
  ProjectServicesProvider,
} from '@/features/project/lib/ProjectServicesContext';
import {
  type TaskServices,
  TaskServicesProvider,
} from '@/features/todo/lib/TaskServicesContext';

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    externalId: 'external-id',
    provider: 'google',
    email: 'test@example.com',
    name: 'テストユーザー',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
    ...overrides,
  };
}

export function buildAuthState(overrides: Partial<AuthState> = {}): AuthState {
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

export function buildTaskServices(
  overrides: Partial<TaskServices> = {},
): TaskServices {
  return {
    useTasks: mock(() => ({ data: [], isLoading: false, error: null })),
    useTaskMutations: mock(() => ({
      createTask: { mutate: mock(() => {}) },
      updateTask: { mutate: mock(() => {}) },
      deleteTask: { mutate: mock(() => {}) },
      changeStatus: { mutate: mock(() => {}) },
    })),
    ...overrides,
  } as TaskServices;
}

export function buildProjectServices(
  overrides: Partial<ProjectServices> = {},
): ProjectServices {
  return {
    useProjects: mock(() => ({ data: [], isLoading: false, error: null })),
    useProjectMutations: mock(),
    useProject: mock(),
    ...overrides,
  } as ProjectServices;
}

interface RenderDashboardShellOptions {
  authState?: AuthState;
  dashboardServices?: DashboardServices;
  taskServices?: TaskServices;
  projectServices?: ProjectServices;
  createTaskSection?: ReactNode;
  filterSortSection?: ReactNode;
  taskListHeading?: ReactNode;
  devDebugSlot?: ReactNode;
}

/**
 * DashboardShell を Redux / DashboardServices / TaskServices の各Providerで
 * ラップしてレンダリングするテスト用ヘルパー
 */
export function renderDashboardShell(
  options: RenderDashboardShellOptions = {},
) {
  const store = configureStore({
    reducer: { auth: authReducer, error: errorReducer },
    preloadedState: { auth: options.authState ?? buildAuthState() },
  });

  const dashboardServices =
    options.dashboardServices ?? buildDashboardServices();
  const taskServices = options.taskServices ?? buildTaskServices();
  const projectServices = options.projectServices ?? buildProjectServices();

  const utils = render(
    <ReduxProvider store={store}>
      <DashboardServicesProvider services={dashboardServices}>
        <TaskServicesProvider services={taskServices}>
          <ProjectServicesProvider services={projectServices}>
            <DashboardShell
              createTaskSection={
                options.createTaskSection ?? <div>CREATE_TASK_SLOT</div>
              }
              filterSortSection={
                options.filterSortSection ?? <div>FILTER_SORT_SLOT</div>
              }
              taskListHeading={
                options.taskListHeading ?? <div>TASK_LIST_HEADING_SLOT</div>
              }
              devDebugSlot={options.devDebugSlot ?? <div>DEV_DEBUG_SLOT</div>}
            />
          </ProjectServicesProvider>
        </TaskServicesProvider>
      </DashboardServicesProvider>
    </ReduxProvider>,
  );

  return { store, ...utils };
}
