import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { Project } from '@hoxt-backlog/shared-schemas/projects';
import { cleanup, screen } from '@testing-library/react';
import {
  buildAuthState,
  buildProjectServices,
  buildUser,
  renderDashboardShell,
} from '../helpers/renderDashboardShell';

const mockProject: Project = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: 'user-1',
  name: 'プロジェクトA',
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('DashboardShell 最近のプロジェクト連携', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('左カラムに最近のプロジェクトとログアウトボタンが同時に表示される', () => {
    // Given: 認証済みユーザーと1件のprojectを返すモック
    renderDashboardShell({
      authState: buildAuthState({ user: buildUser() }),
      projectServices: buildProjectServices({
        useProjects: mock(() => ({
          data: [mockProject],
          isLoading: false,
          error: null,
        })),
      }),
    });

    // When & Then: プロジェクト名リンクとログアウトボタンが両方表示される
    expect(screen.getByRole('link', { name: /プロジェクトA/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeDefined();
  });
});
