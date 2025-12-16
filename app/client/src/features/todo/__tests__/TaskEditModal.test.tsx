import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Task } from '@/packages/shared-schemas/src/tasks';
import TaskEditModal from '../components/TaskEditModal';
import { TaskServicesProvider } from '../lib/TaskServicesContext';

describe('TaskEditModal', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const mockTask: Task = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    title: 'テストタスク',
    description: 'テスト説明',
    priority: 'medium',
    status: 'not_started',
    createdAt: '2025-12-15T00:00:00Z',
    updatedAt: '2025-12-15T00:00:00Z',
  };

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  // 正常系テストケース

  test('モーダルが表示される', () => {
    // Given: TaskEditModalがマウントされ、task propsに編集対象のタスク情報が渡される
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mock(() => {}), isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    // When: コンポーネントがレンダリングされる
    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // Then: モーダルダイアログが画面中央に表示される
    expect(screen.getByRole('dialog')).toBeDefined();

    // Then: タイトル入力欄に既存のタイトルが表示される
    const titleInput = screen.getByLabelText('タイトル') as HTMLInputElement;
    expect(titleInput.value).toBe(mockTask.title);

    // Then: 説明入力欄に既存の説明が表示される
    const descriptionInput = screen.getByLabelText(
      '説明（Markdown）',
    ) as HTMLTextAreaElement;
    expect(descriptionInput.value).toBe(mockTask.description);

    // Then: 優先度選択欄に既存の優先度が選択される
    const prioritySelect = screen.getByDisplayValue('中') as HTMLSelectElement;
    expect(prioritySelect.value).toBe(mockTask.priority);

    // Then: 「保存」ボタンと「キャンセル」ボタンが表示される
    expect(screen.getByRole('button', { name: '保存' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDefined();
  });

  test('タスクが更新される', async () => {
    // Given: モーダルが表示されている状態
    const mockMutate = mock(() => {});
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mockMutate, isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // When: ユーザーがタイトルを「新しいタイトル」に変更し、「保存」ボタンをクリック
    const titleInput = screen.getByLabelText('タイトル');
    await user.clear(titleInput);
    await user.type(titleInput, '新しいタイトル');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: updateTask.mutate() が呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: mockTask.id,
        input: {
          title: '新しいタイトル',
          description: mockTask.description,
          priority: mockTask.priority,
        },
      },
      expect.any(Object),
    );
  });

  test('task === null でモーダル非表示', () => {
    // Given: TaskEditModalがマウントされている
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mock(() => {}), isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    // When: task propsが null
    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={null} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // Then: モーダルは表示されない
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('送信中は保存ボタンが無効化される', () => {
    // Given: モーダルが表示されている状態で、updateTask.isPending === true
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mock(() => {}), isPending: true },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    // When: コンポーネントがレンダリングされる
    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // Then: 保存ボタンが無効化される
    const saveButton = screen.getByRole('button', {
      name: '保存',
    }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  // 異常系テストケース

  test('タイトルが空文字の場合にエラー表示', async () => {
    // Given: モーダルが表示されている状態
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mock(() => {}), isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // When: ユーザーがタイトルを空文字にして「保存」ボタンをクリック
    const titleInput = screen.getByLabelText('タイトル');
    await user.clear(titleInput);
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: クライアント側バリデーションで拒否される
    // Then: エラーメッセージ「タイトルを入力してください」が表示される
    expect(screen.getByText('タイトルを入力してください')).toBeDefined();
  });

  test('タイトルが100文字を超える場合に入力制限', async () => {
    // Given: モーダルが表示されている状態
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mock(() => {}), isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // When: ユーザーがタイトルに101文字を入力しようとする
    const titleInput = screen.getByLabelText('タイトル') as HTMLInputElement;
    const longText = 'a'.repeat(101);
    await user.clear(titleInput);
    await user.type(titleInput, longText);

    // Then: maxLength={100} 属性により101文字目以降は入力不可
    expect(titleInput.value).toHaveLength(100);
  });

  test('API更新失敗時のエラー表示', async () => {
    // Given: モーダルが表示されている状態
    const mockMutateError = mock((_input, { onError }) => {
      onError?.(new Error('タスク更新に失敗しました'));
    });
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mockMutateError, isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // When: ユーザーが「保存」ボタンをクリックし、API呼び出しが失敗
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: エラーメッセージ「タスク更新に失敗しました」が表示される
    expect(screen.getByText('タスク更新に失敗しました')).toBeDefined();

    // Then: モーダルは閉じない（onClose() は呼ばれない）
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  // イベント系テストケース

  test('キャンセルボタンクリック', async () => {
    // Given: モーダルが表示されている状態
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mock(() => {}), isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // When: ユーザーが「キャンセル」ボタンをクリック
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    // Then: props.onClose() が実行される
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('タイトル・説明・優先度の入力変更', async () => {
    // Given: モーダルが表示されている状態
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mock(() => {}), isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // When: ユーザーがタイトル入力欄に「新しいタイトル」を入力
    const titleInput = screen.getByLabelText('タイトル');
    await user.clear(titleInput);
    await user.type(titleInput, '新しいタイトル');

    // Then: 入力欄の値が「新しいタイトル」に更新される
    expect(titleInput).toHaveValue('新しいタイトル');
  });

  // エッジケース

  test('説明がnullの場合', () => {
    // Given: タスクの description が null
    const taskWithoutDescription: Task = {
      ...mockTask,
      description: null,
    };

    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mock(() => {}), isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    // When: モーダルが表示される
    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={taskWithoutDescription} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // Then: 説明入力欄は空文字で初期化される
    const descriptionInput = screen.getByLabelText(
      '説明（Markdown）',
    ) as HTMLTextAreaElement;
    expect(descriptionInput.value).toBe('');
  });

  test('優先度が変更されない場合', async () => {
    // Given: モーダルが表示されている状態
    const mockMutate = mock(() => {});
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mockMutate, isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // When: ユーザーがタイトルのみ変更し、優先度は変更せずに「保存」ボタンをクリック
    const titleInput = screen.getByLabelText('タイトル');
    await user.clear(titleInput);
    await user.type(titleInput, '新しいタイトル');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: updateTask.mutate() の input には変更されたタイトルと、変更されていない説明・優先度が含まれる
    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: mockTask.id,
        input: {
          title: '新しいタイトル',
          description: mockTask.description,
          priority: mockTask.priority,
        },
      },
      expect.any(Object),
    );
  });

  test('API成功時にonCloseが呼ばれる', async () => {
    // Given: モーダルが表示されている状態
    const mockMutateSuccess = mock((_input, options) => {
      // onSuccessコールバックを即座に実行してAPI成功をシミュレート
      options?.onSuccess?.();
    });
    const mockOnClose = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      updateTask: { mutate: mockMutateSuccess, isPending: false },
      createTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskEditModal task={mockTask} onClose={mockOnClose} />
      </TaskServicesProvider>,
    );

    // When: ユーザーが「保存」ボタンをクリックし、API呼び出しが成功
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: onClose() が実行される
    expect(mockOnClose).toHaveBeenCalled();
  });
});
