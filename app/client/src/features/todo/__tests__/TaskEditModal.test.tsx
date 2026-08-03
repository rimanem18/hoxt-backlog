import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import type { Task } from '@/packages/shared-schemas/src/tasks';
import TaskEditModal from '../components/TaskEditModal';
import { TaskServicesProvider } from '../lib/TaskServicesContext';

const projectAId = '770e8400-e29b-41d4-a716-446655440002';
const projectBId = '770e8400-e29b-41d4-a716-446655440003';

// 自分のprojectが2件存在する状態を返すデフォルトのモック
const mockUseProjectsTwo = mock(() => ({
  data: [
    {
      id: projectAId,
      userId: 'user-1',
      name: 'プロジェクトA',
      description: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: projectBId,
      userId: 'user-1',
      name: 'プロジェクトB',
      description: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  isLoading: false,
  error: null,
}));

// project一覧取得中の状態を返すモック
const mockUseProjectsLoading = mock(() => ({
  data: undefined,
  isLoading: true,
  error: null,
}));

function renderWithProviders(
  ui: React.ReactElement,
  taskServices: Parameters<typeof TaskServicesProvider>[0]['services'],
  useProjects: typeof mockUseProjectsTwo = mockUseProjectsTwo,
) {
  return render(
    <ProjectServicesProvider
      services={{
        useProjects,
        useProjectMutations: mock(),
        useProject: mock(),
      }}
    >
      <TaskServicesProvider services={taskServices}>{ui}</TaskServicesProvider>
    </ProjectServicesProvider>,
  );
}

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
    projectId: null,
  };

  const mockTaskWithProjectA: Task = {
    ...mockTask,
    projectId: projectAId,
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
    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // When: ユーザーがタイトルを「新しいタイトル」に変更し、「保存」ボタンをクリック
    const titleInput = screen.getByLabelText('タイトル');
    await user.clear(titleInput);
    await user.type(titleInput, '新しいタイトル');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: updateTask.mutate() が呼ばれる（projectId未変更のため送信されない）
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
    renderWithProviders(<TaskEditModal task={null} onClose={mockOnClose} />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

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
    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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
    renderWithProviders(
      <TaskEditModal task={taskWithoutDescription} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // When: ユーザーが「保存」ボタンをクリックし、API呼び出しが成功
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: onClose() が実行される
    expect(mockOnClose).toHaveBeenCalled();
  });

  // project選択関連テストケース（TASK-9-02）

  test('自分のprojectのみが選択肢として表示される', () => {
    // Given: 自分のprojectが2件存在するモーダル
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
    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // Then: 未所属＋自分のproject2件が選択肢として表示される
    const select = screen.getByLabelText('プロジェクト') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(screen.getByText('プロジェクトA')).toBeDefined();
    expect(screen.getByText('プロジェクトB')).toBeDefined();
  });

  test('project所属済みtaskでは「未所属」の選択肢が表示されない', () => {
    // Given: projectId が projectA のタスク（バックエンドが未所属へのnull送信に非対応のため）
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
    renderWithProviders(
      <TaskEditModal task={mockTaskWithProjectA} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // Then: 選択肢は自分のproject2件のみ（「未所属」は含まれない）
    const select = screen.getByLabelText('プロジェクト') as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(
      Array.from(select.options).some((option) => option.value === ''),
    ).toBe(false);
  });

  test('project未所属taskでは初期値が未所属になる', () => {
    // Given: projectId が null のタスク
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
    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // Then: project選択欄の初期値は未所属（空文字）
    const select = screen.getByLabelText('プロジェクト') as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  test('project所属済みtaskでは初期値が現在のprojectになる', () => {
    // Given: projectId が projectA のタスク
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
    renderWithProviders(
      <TaskEditModal task={mockTaskWithProjectA} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // Then: project選択欄の初期値は現在のproject
    const select = screen.getByLabelText('プロジェクト') as HTMLSelectElement;
    expect(select.value).toBe(projectAId);
  });

  test('project未所属taskにprojectを設定して保存すると、選択したprojectIdが送信される', async () => {
    // Given: projectId が null のタスク
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // When: projectAを選択して保存
    await user.selectOptions(screen.getByLabelText('プロジェクト'), projectAId);
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: projectIdを含めて更新される
    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: mockTask.id,
        input: {
          title: mockTask.title,
          description: mockTask.description,
          priority: mockTask.priority,
          projectId: projectAId,
        },
      },
      expect.any(Object),
    );
  });

  test('所属済みtaskの所属projectを別のprojectに変更して保存すると、新しいprojectIdが送信される', async () => {
    // Given: projectId が projectA のタスク
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

    renderWithProviders(
      <TaskEditModal task={mockTaskWithProjectA} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // When: projectBに変更して保存
    await user.selectOptions(screen.getByLabelText('プロジェクト'), projectBId);
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: 新しいprojectIdが送信される
    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: mockTaskWithProjectA.id,
        input: {
          title: mockTaskWithProjectA.title,
          description: mockTaskWithProjectA.description,
          priority: mockTaskWithProjectA.priority,
          projectId: projectBId,
        },
      },
      expect.any(Object),
    );
  });

  test('project変更なしで他フィールドのみ更新した場合、projectIdは送信されない', async () => {
    // Given: projectId が projectA のタスク（project選択欄は操作しない）
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

    renderWithProviders(
      <TaskEditModal task={mockTaskWithProjectA} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // When: タイトルのみ変更して保存
    const titleInput = screen.getByLabelText('タイトル');
    await user.clear(titleInput);
    await user.type(titleInput, '新しいタイトル');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: projectIdはinputに含まれない
    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: mockTaskWithProjectA.id,
        input: {
          title: '新しいタイトル',
          description: mockTaskWithProjectA.description,
          priority: mockTaskWithProjectA.priority,
        },
      },
      expect.any(Object),
    );
  });

  test('project一覧取得中はローディング表示になる', () => {
    // Given: project一覧取得中の状態
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
    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
      mockUseProjectsLoading,
    );

    // Then: ローディング表示になる
    expect(screen.getByText('プロジェクトを読み込み中...')).toBeDefined();
  });

  test('project未所属taskを開いても他フィールドの編集・保存が正常に機能する', async () => {
    // Given: project未所属タスク
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

    renderWithProviders(
      <TaskEditModal task={mockTask} onClose={mockOnClose} />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
    );

    // When: 優先度のみ変更して保存（projectは操作しない）
    await user.selectOptions(screen.getByLabelText('優先度'), 'high');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: projectIdなしで他フィールドの更新が成功する
    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: mockTask.id,
        input: {
          title: mockTask.title,
          description: mockTask.description,
          priority: 'high',
        },
      },
      expect.any(Object),
    );
  });
});
