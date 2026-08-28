import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Task } from '@hoxt-backlog/shared-schemas/tasks';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import EditableTaskList from '../components/EditableTaskList';
import { TaskServicesProvider } from '../lib/TaskServicesContext';

const TASK: Task = {
  id: 'task-1',
  userId: 'user-1',
  title: '編集対象タスク',
  description: null,
  priority: 'medium',
  status: 'not_started',
  createdAt: '2025-12-12T00:00:00Z',
  updatedAt: '2025-12-12T00:00:00Z',
  projectId: null,
};

function renderEditableTaskList(
  projectId: string | undefined,
  useTasks: Parameters<typeof TaskServicesProvider>[0]['services']['useTasks'],
) {
  return render(
    <ProjectServicesProvider
      services={{
        useProjects: mock(() => ({ data: [], isLoading: false, error: null })),
        useProjectMutations: mock(),
        useProject: mock(),
      }}
    >
      <TaskServicesProvider
        services={{
          useTasks,
          useTaskMutations: mock(() => ({
            createTask: { mutate: mock(() => {}) },
            updateTask: { mutate: mock(() => {}), isPending: false },
            deleteTask: { mutate: mock(() => {}) },
            changeStatus: { mutate: mock(() => {}) },
          })),
        }}
      >
        <EditableTaskList projectId={projectId} />
      </TaskServicesProvider>
    </ProjectServicesProvider>,
  );
}

describe('EditableTaskList', () => {
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
    const mockUseTasks = mock(() => ({
      data: [TASK],
      isLoading: false,
      error: null,
    }));

    // When: EditableTaskListをレンダリングし、編集ボタンを押下
    renderEditableTaskList(undefined, mockUseTasks);
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

  test('projectIdがタスク取得条件として渡される', () => {
    // Given: タスクが存在しない状態
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    // When: projectId付きでEditableTaskListをレンダリング
    renderEditableTaskList('proj-123', mockUseTasks);

    // Then: useTasksがprojectIdを引数に呼ばれる
    expect(mockUseTasks).toHaveBeenCalledWith('proj-123');
  });
});
