import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { Provider } from 'react-redux';
import taskReducer from '@/features/todo/store/taskSlice';
import type { Task } from '@/packages/shared-schemas/src/tasks';

// テスト用のモックタスク
const mockTasks: Task[] = [
  {
    id: 'task-1',
    userId: 'user-1',
    title: 'テスト1',
    description: 'テスト説明1',
    priority: 'high',
    status: 'not_started',
    createdAt: '2025-12-12T00:00:00Z',
    updatedAt: '2025-12-12T00:00:00Z',
  },
  {
    id: 'task-2',
    userId: 'user-1',
    title: 'テスト2',
    description: null,
    priority: 'medium',
    status: 'in_progress',
    createdAt: '2025-12-12T00:00:00Z',
    updatedAt: '2025-12-12T00:00:00Z',
  },
];

// テスト用のコンポーネントラッパー
function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const store = configureStore({
    reducer: {
      task: taskReducer,
    },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </Provider>,
  );
}

describe('TaskList', () => {
  // モックフック
  const mockUseTasks = mock(function useTasks() {
    return {
      data: [],
      isLoading: false,
      error: null,
    };
  });

  const mockUseTaskMutations = mock(function useTaskMutations() {
    return {
      deleteTask: { mutate: mock(() => {}) },
      changeStatus: { mutate: mock(() => {}) },
    };
  });

  // describe単位でmock.moduleを固定（新ガイドライン準拠）
  mock.module('@/features/todo/hooks/useTasks', () => ({
    useTasks: mockUseTasks,
  }));

  mock.module('@/features/todo/hooks/useTaskMutations', () => ({
    useTaskMutations: mockUseTaskMutations,
  }));

  beforeEach(() => {
    // モックをリセット
    mockUseTasks.mockClear?.();
    mockUseTaskMutations.mockClear?.();
  });

  // 正常系テスト
  describe('正常系', () => {
    test('タスク一覧が表示される', async () => {
      // Given: タスク一覧を返すモック
      const mockDeleteMutate = mock(() => {});
      const mockChangeStatusMutate = mock(() => {});

      mockUseTasks.mockImplementation(() => ({
        data: mockTasks,
        isLoading: false,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mockDeleteMutate },
        changeStatus: { mutate: mockChangeStatusMutate },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      renderWithProviders(<TaskList />);

      // Then: 各タスクのタイトルが表示される
      expect(screen.getByText('テスト1')).toBeTruthy();
      expect(screen.getByText('テスト2')).toBeTruthy();
    });

    test('ローディング表示が正しく表示される', async () => {
      // Given: ローディング状態を返すモック
      mockUseTasks.mockImplementation(() => ({
        data: undefined,
        isLoading: true,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      renderWithProviders(<TaskList />);

      // Then: ローディングテキストが表示される
      expect(screen.getByText('読み込み中...')).toBeTruthy();
    });

    test('エラー表示が正しく表示される', async () => {
      // Given: エラー状態を返すモック
      const mockError = new Error('API error');
      mockUseTasks.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
        error: mockError,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      renderWithProviders(<TaskList />);

      // Then: エラーテキストが表示される
      expect(screen.getByText('エラーが発生しました')).toBeTruthy();
    });

    test('空状態表示が正しく表示される', async () => {
      // Given: 空配列を返すモック
      mockUseTasks.mockImplementation(() => ({
        data: [],
        isLoading: false,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      renderWithProviders(<TaskList />);

      // Then: 空状態テキストが表示される
      expect(screen.getByText('タスクがありません')).toBeTruthy();
    });

    test('dataがundefinedの場合は空状態表示される', async () => {
      // Given: undefinedを返すモック
      mockUseTasks.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      renderWithProviders(<TaskList />);

      // Then: 空状態テキストが表示される
      const emptyTextElements = screen.getAllByText('タスクがありません');
      expect(emptyTextElements.length).toBeGreaterThan(0);
      expect(emptyTextElements[0]).toBeTruthy();
    });
  });

  // UIスタイルテスト
  describe('UIスタイル', () => {
    test('ローディング表示は中央配置される', async () => {
      // Given: ローディング状態を返すモック
      mockUseTasks.mockImplementation(() => ({
        data: undefined,
        isLoading: true,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      const { container } = renderWithProviders(<TaskList />);

      // Then: テキストコンテナに適切なクラスが設定される
      const loadingDiv = container.querySelector('.text-center');
      expect(loadingDiv).toBeTruthy();
      expect(loadingDiv?.className).toMatch(/text-center/);
      expect(loadingDiv?.className).toMatch(/py-8/);
    });

    test('エラー表示は中央配置・赤文字である', async () => {
      // Given: エラー状態を返すモック
      const mockError = new Error('API error');
      mockUseTasks.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
        error: mockError,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      const { container } = renderWithProviders(<TaskList />);

      // Then: エラーコンテナに適切なクラスが設定される
      const errorDiv = container.querySelector('.text-red-600');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv?.className).toMatch(/text-red-600/);
    });

    test('空状態表示は中央配置・グレー文字である', async () => {
      // Given: 空配列を返すモック
      mockUseTasks.mockImplementation(() => ({
        data: [],
        isLoading: false,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      const { container } = renderWithProviders(<TaskList />);

      // Then: 空状態コンテナに適切なクラスが設定される
      const emptyDiv = container.querySelector('.text-gray-500');
      expect(emptyDiv).toBeTruthy();
      expect(emptyDiv?.className).toMatch(/text-gray-500/);
    });

    test('タスク一覧はspace-y-0で余白なし', async () => {
      // Given: タスク一覧を返すモック
      mockUseTasks.mockImplementation(() => ({
        data: mockTasks,
        isLoading: false,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      const { container } = renderWithProviders(<TaskList />);

      // Then: タスク一覧コンテナにspace-y-0クラスが設定される
      const taskListDiv = container.querySelector('.space-y-0');
      expect(taskListDiv).toBeTruthy();
    });

    test('aria-live属性がローディング状態に設定される', async () => {
      // Given: ローディング状態を返すモック
      mockUseTasks.mockImplementation(() => ({
        data: undefined,
        isLoading: true,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      const { container } = renderWithProviders(<TaskList />);

      // Then: aria-live="polite"が設定される
      const loadingDiv = container.querySelector('[aria-live="polite"]');
      expect(loadingDiv).toBeTruthy();
    });
  });

  // イベント系テスト
  describe('イベント処理', () => {
    test('タスク削除ボタンが表示される', async () => {
      // Given: タスク一覧
      mockUseTasks.mockImplementation(() => ({
        data: mockTasks,
        isLoading: false,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      renderWithProviders(<TaskList />);

      // Then: 削除ボタンが表示される
      const deleteButtons = screen.getAllByLabelText('タスクを削除');
      expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
    });

    test('ステータス変更セレクトボックスが表示される', async () => {
      // Given: タスク一覧
      mockUseTasks.mockImplementation(() => ({
        data: mockTasks,
        isLoading: false,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      renderWithProviders(<TaskList />);

      // Then: ステータス変更セレクトが表示される
      const statusSelects = screen.getAllByLabelText('ステータスを変更');
      expect(statusSelects.length).toBeGreaterThanOrEqual(2);
    });

    test('編集ボタンが表示される', async () => {
      // Given: タスク一覧
      mockUseTasks.mockImplementation(() => ({
        data: mockTasks,
        isLoading: false,
        error: null,
      }));

      mockUseTaskMutations.mockImplementation(() => ({
        deleteTask: { mutate: mock(() => {}) },
        changeStatus: { mutate: mock(() => {}) },
      }));

      // When: TaskListをインポートしてレンダリング
      const TaskList = (await import('../components/TaskList')).default;
      renderWithProviders(<TaskList />);

      // Then: 編集ボタンが表示される
      const editButtons = screen.getAllByLabelText('タスクを編集');
      expect(editButtons.length).toBeGreaterThanOrEqual(2);
    });
  });
});
