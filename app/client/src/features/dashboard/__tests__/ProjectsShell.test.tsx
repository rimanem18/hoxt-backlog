import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { Project } from '@hoxt-backlog/shared-schemas/projects';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider as ReduxProvider } from 'react-redux';
import authReducer from '@/features/auth/store/authSlice';
import errorReducer from '@/features/auth/store/errorSlice';
import { ProjectsShell } from '@/features/dashboard/components/ProjectsShell';
import {
  type ProjectServices,
  ProjectServicesProvider,
} from '@/features/project/lib/ProjectServicesContext';
import { buildAuthState, buildUser } from './helpers/renderDashboardShell';

function buildProjectServices(
  overrides: Partial<ProjectServices> = {},
): ProjectServices {
  return {
    useProjects: mock(() => ({ data: [], isLoading: false, error: null })),
    useProjectMutations: mock(),
    useProject: mock(),
    ...overrides,
  } as ProjectServices;
}

function renderProjectsShell(
  authState = buildAuthState(),
  projectServices = buildProjectServices(),
) {
  const store = configureStore({
    reducer: { auth: authReducer, error: errorReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <ReduxProvider store={store}>
      <ProjectServicesProvider services={projectServices}>
        <ProjectsShell>
          <div>CHILD</div>
        </ProjectsShell>
      </ProjectServicesProvider>
    </ReduxProvider>,
  );
}

describe('ProjectsShell', () => {
  afterEach(() => {
    cleanup();
  });

  test('認証済みユーザーではログアウトボタンとユーザー名が表示される', () => {
    // Given: 認証済みユーザー
    renderProjectsShell(
      buildAuthState({ user: buildUser({ name: 'テストユーザー' }) }),
    );

    // When & Then: ログアウトボタンとユーザー名が表示される
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeDefined();
    expect(screen.getByText('テストユーザー')).toBeDefined();
  });

  test('childrenがメイン領域に描画される', () => {
    // Given: 認証済みユーザー
    renderProjectsShell(buildAuthState({ user: buildUser() }));

    // When & Then: childrenが表示される
    expect(screen.getByText('CHILD')).toBeDefined();
  });

  test('未認証状態ではサイドバーが描画されない', () => {
    // Given: 未認証状態（user: null）
    renderProjectsShell(buildAuthState({ user: null }));

    // When & Then: ログアウトボタンは表示されず、childrenは表示される
    expect(screen.queryByRole('button', { name: 'ログアウト' })).toBeNull();
    expect(screen.getByText('CHILD')).toBeDefined();
  });

  test('サイドバーに最近のプロジェクトが表示される', () => {
    // Given: 認証済みユーザーと1件のprojectを返すモック
    const mockProject: Project = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      userId: 'user-1',
      name: 'プロジェクトA',
      description: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    renderProjectsShell(
      buildAuthState({ user: buildUser() }),
      buildProjectServices({
        useProjects: mock(() => ({
          data: [mockProject],
          isLoading: false,
          error: null,
        })),
      }),
    );

    // When & Then: 最近のプロジェクトのリンクが表示される
    expect(screen.getByRole('link', { name: /プロジェクトA/ })).toBeDefined();
  });

  test('開いているプロジェクトと同一のprojectも最近のプロジェクトに表示される', () => {
    // Given: 現在開いているprojectと同一のIDを含む一覧を返すモック
    const openProject: Project = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      userId: 'user-1',
      name: '開いているプロジェクト',
      description: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    renderProjectsShell(
      buildAuthState({ user: buildUser() }),
      buildProjectServices({
        useProjects: mock(() => ({
          data: [openProject],
          isLoading: false,
          error: null,
        })),
      }),
    );

    // When & Then: 除外されず、そのまま表示される
    expect(
      screen.getByRole('link', { name: /開いているプロジェクト/ }),
    ).toBeDefined();
  });
});
