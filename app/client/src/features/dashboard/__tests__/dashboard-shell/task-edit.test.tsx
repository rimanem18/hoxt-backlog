import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Task } from '@hoxt-backlog/shared-schemas/tasks';
import userEvent from '@testing-library/user-event';
import {
  buildTaskServices,
  renderDashboardShell,
} from '../helpers/renderDashboardShell';

const TASK: Task = {
  id: 'task-1',
  userId: 'user-1',
  title: '編集対象タスク',
  description: null,
  priority: 'medium',
  status: 'not_started',
  createdAt: '2025-12-12T00:00:00Z',
  updatedAt: '2025-12-12T00:00:00Z',
};

describe('DashboardShell タスク編集モーダル連携', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('編集ボタン押下で編集モーダルが開き、キャンセルで閉じる', async () => {
    // Given: タスクが1件存在する状態
    const taskServices = buildTaskServices({
      useTasks: mock(() => ({ data: [TASK], isLoading: false, error: null })),
    });

    // When: DashboardShellをレンダリングし、編集ボタンを押下
    renderDashboardShell({ taskServices });
    expect(
      screen.queryByRole('heading', { name: 'タスクを編集' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'タスクを編集' }));

    // Then: 編集モーダルが開く
    expect(
      screen.getByRole('heading', { name: 'タスクを編集' }),
    ).toBeInTheDocument();

    // When: キャンセルボタンを押下
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    // Then: 編集モーダルが閉じる
    expect(
      screen.queryByRole('heading', { name: 'タスクを編集' }),
    ).not.toBeInTheDocument();
  });
});
