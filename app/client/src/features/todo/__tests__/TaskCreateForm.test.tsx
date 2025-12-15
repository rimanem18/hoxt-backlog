import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCreateForm from '../components/TaskCreateForm';
import { TaskServicesProvider } from '../lib/TaskServicesContext';

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

  test('タスクが作成される', async () => {
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    // When: タイトルを入力して追加ボタンをクリック
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      '会議資料作成',
    );
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: createTask.mutateが正しい引数で呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      { title: '会議資料作成', priority: 'medium' },
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutationsSuccess,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    // When: タスクを作成
    const titleInput = screen.getByPlaceholderText('タスクを入力...');
    const prioritySelect = screen.getByRole('combobox');

    await user.type(titleInput, 'テストタスク');
    await user.selectOptions(prioritySelect, 'high');
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: フォームがリセットされる
    expect(titleInput).toHaveValue('');
    expect(prioritySelect).toHaveValue('medium');
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations100,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    // When: 100文字のタイトルを入力して送信
    const title100 = 'a'.repeat(100);
    await user.type(screen.getByPlaceholderText('タスクを入力...'), title100);
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: createTask.mutateが呼ばれる
    expect(mockMutate100).toHaveBeenCalledWith(
      { title: title100, priority: 'medium' },
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations101,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    const input = screen.getByPlaceholderText(
      'タスクを入力...',
    ) as HTMLInputElement;

    // When: 101文字を入力しようとする
    const longText = 'a'.repeat(101);
    await user.type(input, longText);

    // Then: maxLength属性により100文字に制限される
    expect(input.value).toHaveLength(100);

    // When: 送信ボタンをクリック
    await user.click(screen.getByRole('button', { name: '追加' }));

    // Then: エラーメッセージは表示されない（正常に100文字で送信）
    expect(
      screen.queryByText('タイトルは100文字以内で入力してください'),
    ).toBeNull();
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    // When: 優先度を「高」に変更
    await user.selectOptions(screen.getByRole('combobox'), 'high');

    // Then: 選択値が反映される
    expect(screen.getByRole('combobox')).toHaveValue('high');
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutationsEnter,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    const input = screen.getByPlaceholderText('タスクを入力...');

    // When: タイトルを入力してEnterキーを押下
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutationsLoading,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutationsError,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    // When: タスクを作成してエラーが発生
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      'エラーテスト',
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutationsNetworkError,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    // When: タスクを作成してネットワークエラーが発生
    await user.type(
      screen.getByPlaceholderText('タスクを入力...'),
      'ネットワークエラーテスト',
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

    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutationsRetry,
        }}
      >
        <TaskCreateForm />
      </TaskServicesProvider>,
    );

    // Given: 初回タスク作成（priority: medium）
    const titleInput = screen.getByPlaceholderText('タスクを入力...');
    const prioritySelect = screen.getByRole('combobox');
    await user.type(titleInput, '初回タスク');
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
    });
  });
});
