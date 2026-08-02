import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import TaskCreateForm from '../components/TaskCreateForm';
import { TaskServicesProvider } from '../lib/TaskServicesContext';

const mockProjectId = '770e8400-e29b-41d4-a716-446655440002';

// 自分のprojectが1件存在する状態を返すデフォルトのモック
const mockUseProjectsWithOne = mock(() => ({
  data: [
    {
      id: mockProjectId,
      userId: 'user-1',
      name: 'プロジェクトA',
      description: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  isLoading: false,
  error: null,
}));

// 自分のprojectが0件の状態を返すモック
const mockUseProjectsEmpty = mock(() => ({
  data: [],
  isLoading: false,
  error: null,
}));

function renderWithProviders(
  ui: React.ReactElement,
  taskServices: Parameters<typeof TaskServicesProvider>[0]['services'],
  useProjects: typeof mockUseProjectsWithOne = mockUseProjectsWithOne,
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

describe('TaskCreateForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  // 正常系テストケース

  test('タイトル・優先度・projectIdを指定してタスクが作成される', async () => {
    // Given: TaskCreateFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      createTask: {
        mutate: mockMutate,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // When: タイトル・projectを入力して追加ボタンをクリック
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      '会議資料作成',
    );
    await user.selectOptions(
      screen.getByLabelText('プロジェクト'),
      mockProjectId,
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: createTask.mutateが正しい引数で呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      { title: '会議資料作成', priority: 'medium', projectId: mockProjectId },
      expect.any(Object),
    );
  });

  test('フォームがリセットされる', async () => {
    // Given: タスク作成が成功する設定
    const mockMutateSuccess = mock((_input, { onSuccess }) => {
      onSuccess?.();
    });
    const mockUseTaskMutationsSuccess = mock(() => ({
      createTask: {
        mutate: mockMutateSuccess,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutationsSuccess,
    });

    // When: タスクを作成
    const titleInput = screen.getByPlaceholderText('タスクを入力...');
    const prioritySelect = screen.getByLabelText('優先度');
    const projectSelect = screen.getByLabelText('プロジェクト');

    await user.type(titleInput, 'テストタスク');
    await user.selectOptions(prioritySelect, 'high');
    await user.selectOptions(projectSelect, mockProjectId);
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: タイトル・優先度はリセットされる
    expect(titleInput).toHaveValue('');
    expect(prioritySelect).toHaveValue('medium');
  });

  test('作成成功後も選択中のプロジェクトが保持される', async () => {
    // Given: タスク作成が成功する設定（同じprojectへの連続追加を想定）
    const mockMutateSuccess = mock((_input, { onSuccess }) => {
      onSuccess?.();
    });
    const mockUseTaskMutationsSuccess = mock(() => ({
      createTask: {
        mutate: mockMutateSuccess,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutationsSuccess,
    });

    // When: projectを選択してタスクを作成
    const projectSelect = screen.getByLabelText('プロジェクト');
    await user.type(screen.getByPlaceholderText('タスクを入力...'), 'タスク1');
    await user.selectOptions(projectSelect, mockProjectId);
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: 同じprojectへ連続追加できるよう、選択中のprojectは維持される
    expect(projectSelect).toHaveValue(mockProjectId);
  });

  test('タイトル100文字が正常に送信される', async () => {
    // Given: TaskCreateFormが表示されている
    const mockMutate100 = mock(() => {});
    const mockUseTaskMutations100 = mock(() => ({
      createTask: {
        mutate: mockMutate100,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations100,
    });

    // When: 100文字のタイトルを入力して送信
    const title100 = 'a'.repeat(100);
    await user.type(screen.getByPlaceholderText('タスクを入力...'), title100);
    await user.selectOptions(
      screen.getByLabelText('プロジェクト'),
      mockProjectId,
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: createTask.mutateが呼ばれる
    expect(mockMutate100).toHaveBeenCalledWith(
      { title: title100, priority: 'medium', projectId: mockProjectId },
      expect.any(Object),
    );
  });

  // 異常系テストケース

  test('空文字列または空白のみでボタンが無効化される', async () => {
    // Given: TaskCreateFormが表示されている
    const mockUseTaskMutations = mock(() => ({
      createTask: {
        mutate: mock(() => {}),
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // When: 空文字列の場合
    const submitButton = screen.getByRole('button', { name: '追加' });
    expect(submitButton).toBeDisabled();

    // When: 空白のみを入力
    const titleInput = screen.getByPlaceholderText('タスクを入力...');
    await user.type(titleInput, '   ');

    // Then: ボタンは無効化されたまま（trim後が空文字のため）
    expect(submitButton).toBeDisabled();
  });

  test('101文字入力が制限され、100文字で送信される', async () => {
    // Given: TaskCreateFormが表示されている
    const mockMutate101 = mock(() => {});
    const mockUseTaskMutations101 = mock(() => ({
      createTask: {
        mutate: mockMutate101,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations101,
    });

    const input = screen.getByPlaceholderText(
      'タスクを入力...',
    ) as HTMLInputElement;

    // When: 101文字を入力しようとする
    const longText = 'a'.repeat(101);
    await user.type(input, longText);

    // Then: maxLength属性により100文字に制限される
    expect(input.value).toHaveLength(100);

    // When: projectを選択して送信ボタンをクリック
    await user.selectOptions(
      screen.getByLabelText('プロジェクト'),
      mockProjectId,
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: エラーメッセージは表示されない（正常に100文字で送信）
    expect(
      screen.queryByText('タイトルは100文字以内で入力してください'),
    ).toBeNull();
  });

  test('projectを選択せずに送信するとエラーが表示され送信されない', async () => {
    // Given: TaskCreateFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      createTask: {
        mutate: mockMutate,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // When: projectを選択せずにタイトルのみ入力して送信
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      'プロジェクト未選択タスク',
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: エラーメッセージが表示され、mutateは呼ばれない
    expect(screen.getByText('プロジェクトを選択してください')).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('projectが0件の場合は選択肢がプレースホルダーのみになる', () => {
    // Given: projectが0件のモック
    const mockUseTaskMutations = mock(() => ({
      createTask: { mutate: mock(() => {}), isPending: false },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(
      <TaskCreateForm />,
      { useTasks: mockUseTasks, useTaskMutations: mockUseTaskMutations },
      mockUseProjectsEmpty,
    );

    // Then: プレースホルダーの選択肢のみが表示される
    const select = screen.getByLabelText('プロジェクト') as HTMLSelectElement;
    expect(select.options.length).toBe(1);
  });

  // イベントテストケース

  test('タイトル入力ができる', async () => {
    // Given: TaskCreateFormが表示されている
    const mockUseTaskMutations = mock(() => ({
      createTask: {
        mutate: mock(() => {}),
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // When: タイトルを入力
    const titleInput = screen.getByPlaceholderText('タスクを入力...');
    await user.type(titleInput, 'テストタスク');

    // Then: 入力値が反映される
    expect(titleInput).toHaveValue('テストタスク');
  });

  test('優先度選択ができる', async () => {
    // Given: TaskCreateFormが表示されている
    const mockUseTaskMutations = mock(() => ({
      createTask: {
        mutate: mock(() => {}),
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // When: 優先度を「高」に変更
    await user.selectOptions(screen.getByLabelText('優先度'), 'high');

    // Then: 選択値が反映される
    expect(screen.getByLabelText('優先度')).toHaveValue('high');
  });

  test('project選択ができる', async () => {
    // Given: TaskCreateFormが表示されている
    const mockUseTaskMutations = mock(() => ({
      createTask: {
        mutate: mock(() => {}),
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // When: projectを選択
    await user.selectOptions(
      screen.getByLabelText('プロジェクト'),
      mockProjectId,
    );

    // Then: 選択値が反映される
    expect(screen.getByLabelText('プロジェクト')).toHaveValue(mockProjectId);
  });

  test('Enterキーでフォーム送信できる', async () => {
    // Given: TaskCreateFormが表示されている
    const mockMutateEnter = mock(() => {});
    const mockUseTaskMutationsEnter = mock(() => ({
      createTask: {
        mutate: mockMutateEnter,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutationsEnter,
    });

    const input = screen.getByPlaceholderText('タスクを入力...');

    // When: projectを選択し、タイトルを入力してEnterキーを押下
    await user.selectOptions(
      screen.getByLabelText('プロジェクト'),
      mockProjectId,
    );
    await user.type(input, 'Enterキーテスト{Enter}');

    // Then: createTask.mutateが呼ばれる
    expect(mockMutateEnter).toHaveBeenCalled();
  });

  // ローディング状態テストケース

  test('送信中はボタンが無効化される', () => {
    // Given: 送信中の状態
    const mockUseTaskMutationsLoading = mock(() => ({
      createTask: {
        mutate: mock(() => {}),
        isPending: true,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutationsLoading,
    });

    // When: 送信中
    const submitButton = screen.getByRole('button', { name: '追加' });

    // Then: 送信ボタンが無効化されている
    expect(submitButton).toBeDisabled();
  });

  // エラーハンドリングテストケース

  test('APIエラー時にエラーメッセージが表示される', async () => {
    // Given: APIがエラーを返す設定
    const mockMutateError = mock((_input, { onError }) => {
      onError?.(new Error('タスク作成に失敗しました'));
    });
    const mockUseTaskMutationsError = mock(() => ({
      createTask: {
        mutate: mockMutateError,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutationsError,
    });

    // When: タスクを作成してエラーが発生
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      'エラーテスト',
    );
    await user.selectOptions(
      screen.getByLabelText('プロジェクト'),
      mockProjectId,
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: エラーメッセージが表示される
    expect(screen.getByText('タスク作成に失敗しました')).toBeDefined();

    // Then: 入力値は保持される
    expect(screen.getByPlaceholderText('タスクを入力...')).toHaveValue(
      'エラーテスト',
    );
  });

  test('ネットワークエラー時にリトライボタンが表示される', async () => {
    // Given: ネットワークエラーが発生する設定
    const mockMutateNetworkError = mock((_input, { onError }) => {
      onError?.(new Error('通信エラーが発生しました。再試行してください'));
    });
    const mockUseTaskMutationsNetworkError = mock(() => ({
      createTask: {
        mutate: mockMutateNetworkError,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutationsNetworkError,
    });

    // When: タスクを作成してネットワークエラーが発生
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      'ネットワークエラーテスト',
    );
    await user.selectOptions(
      screen.getByLabelText('プロジェクト'),
      mockProjectId,
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: エラーメッセージが表示される
    expect(
      screen.getByText('通信エラーが発生しました。再試行してください'),
    ).toBeDefined();

    // Then: リトライボタンが表示される
    expect(screen.getByRole('button', { name: '再試行' })).toBeDefined();

    // When: リトライボタンをクリック
    await user.click(screen.getByRole('button', { name: '再試行' }));

    // Then: createTask.mutateが再度呼ばれる
    expect(mockMutateNetworkError).toHaveBeenCalledTimes(2);
  });

  test('再試行時は最新の入力値で送信される', async () => {
    // Given: 初回はエラー、再試行時は成功する設定
    const mockMutateRetry = mock((_input, { onError, onSuccess }) => {
      if (mockMutateRetry.mock.calls.length === 1) {
        // 初回はエラー
        onError?.(new Error('タスク作成に失敗しました'));
      } else {
        // 再試行時は成功
        onSuccess?.();
      }
    });
    const mockUseTaskMutationsRetry = mock(() => ({
      createTask: {
        mutate: mockMutateRetry,
        isPending: false,
      },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutationsRetry,
    });

    // Given: 初回タスク作成（priority: medium）
    const titleInput = screen.getByPlaceholderText('タスクを入力...');
    const prioritySelect = screen.getByLabelText('優先度');
    await user.type(titleInput, '初回タスク');
    await user.selectOptions(
      screen.getByLabelText('プロジェクト'),
      mockProjectId,
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: エラーメッセージが表示される
    expect(screen.getByText('タスク作成に失敗しました')).toBeDefined();

    // When: ユーザーが入力値を修正（タイトルと優先度を変更）
    await user.clear(titleInput);
    await user.type(titleInput, '修正後タスク');
    await user.selectOptions(prioritySelect, 'high');

    // When: 再試行ボタンをクリック
    await user.click(screen.getByRole('button', { name: '再試行' }));

    // Then: 最新の入力値で送信される
    expect(mockMutateRetry).toHaveBeenCalledTimes(2);
    expect(mockMutateRetry.mock.calls[1][0]).toEqual({
      title: '修正後タスク',
      priority: 'high',
      projectId: mockProjectId,
    });
  });

  // fixedProjectId指定時のテストケース

  test('fixedProjectId指定時はプロジェクト選択セレクトが表示されない', () => {
    // Given: fixedProjectIdを指定したTaskCreateForm
    const mockUseTaskMutations = mock(() => ({
      createTask: { mutate: mock(() => {}), isPending: false },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm fixedProjectId={mockProjectId} />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // Then: プロジェクト選択セレクトが表示されない
    expect(screen.queryByLabelText('プロジェクト')).toBeNull();
  });

  test('fixedProjectId指定時はproject選択操作なしにそのprojectIdでタスクが作成される', async () => {
    // Given: fixedProjectIdを指定したTaskCreateForm
    const mockMutate = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      createTask: { mutate: mockMutate, isPending: false },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm fixedProjectId={mockProjectId} />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // When: プロジェクトを選択せずタイトルのみ入力して送信
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      'プロジェクト詳細画面からのタスク',
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: fixedProjectIdがそのままprojectIdとして送信される
    expect(mockMutate).toHaveBeenCalledWith(
      {
        title: 'プロジェクト詳細画面からのタスク',
        priority: 'medium',
        projectId: mockProjectId,
      },
      expect.any(Object),
    );
  });

  test('fixedProjectId未指定時は既存動作どおりプロジェクト選択が必須のまま', async () => {
    // Given: fixedProjectIdを指定しないTaskCreateForm（既存動作の回帰確認）
    const mockMutate = mock(() => {});
    const mockUseTaskMutations = mock(() => ({
      createTask: { mutate: mockMutate, isPending: false },
      updateTask: { mutate: mock(() => {}), isPending: false },
      deleteTask: { mutate: mock(() => {}), isPending: false },
      changeStatus: { mutate: mock(() => {}), isPending: false },
    }));
    const mockUseTasks = mock(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    renderWithProviders(<TaskCreateForm />, {
      useTasks: mockUseTasks,
      useTaskMutations: mockUseTaskMutations,
    });

    // Then: プロジェクト選択セレクトが表示される
    expect(screen.getByLabelText('プロジェクト')).toBeDefined();

    // When: プロジェクトを選択せず送信
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      'プロジェクト未選択タスク',
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: バリデーションエラーが表示され送信されない
    expect(screen.getByText('プロジェクトを選択してください')).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
