import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import TaskFilter from '../components/TaskFilter';
import taskReducer, {
  setPriorityFilter,
  setStatusFilter,
} from '../store/taskSlice';

describe('TaskFilter', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const createTestStore = () =>
    configureStore({
      reducer: {
        task: taskReducer,
      },
    });

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  // 正常系: フィルタが表示される

  test('優先度セレクトボックスが表示される', () => {
    // Given: TaskFilterコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // Then: 優先度セレクトボックスが表示される
    const prioritySelect = screen.getByLabelText('優先度フィルタ');
    expect(prioritySelect).toBeDefined();
    expect(prioritySelect.tagName).toBe('SELECT');
  });

  test('ステータスセレクトボックスが表示される', () => {
    // Given: TaskFilterコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // Then: ステータスセレクトボックスが表示される
    const statusSelect = screen
      .getAllByRole('listbox')
      .find((select) => (select as HTMLSelectElement).multiple);
    expect(statusSelect).toBeDefined();
    expect((statusSelect as HTMLSelectElement).multiple).toBe(true);
  });

  test('ラベルが表示される', () => {
    // Given: TaskFilterコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // Then: 優先度ラベルが表示される
    expect(screen.getByText('優先度')).toBeDefined();
    // Then: ステータスラベルが表示される
    expect(screen.getByText('ステータス')).toBeDefined();
  });

  // イベント: 優先度選択

  test('優先度が「高」に変更される', async () => {
    // Given: 優先度フィルタが「すべて」に設定されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: ユーザーが優先度セレクトボックスで「高」を選択
    const prioritySelect = screen.getByLabelText('優先度フィルタ');
    await user.selectOptions(prioritySelect, 'high');

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.filters.priority).toBe('high');
  });

  test('優先度が「中」に変更される', async () => {
    // Given: 優先度フィルタが「すべて」に設定されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: ユーザーが優先度セレクトボックスで「中」を選択
    const prioritySelect = screen.getByLabelText('優先度フィルタ');
    await user.selectOptions(prioritySelect, 'medium');

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.filters.priority).toBe('medium');
  });

  test('優先度が「低」に変更される', async () => {
    // Given: 優先度フィルタが「すべて」に設定されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: ユーザーが優先度セレクトボックスで「低」を選択
    const prioritySelect = screen.getByLabelText('優先度フィルタ');
    await user.selectOptions(prioritySelect, 'low');

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.filters.priority).toBe('low');
  });

  test('優先度が「すべて」に戻される', async () => {
    // Given: 優先度フィルタが「高」に設定されている
    const store = createTestStore();
    store.dispatch(setPriorityFilter('high'));

    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: ユーザーが優先度セレクトボックスで「すべて」を選択
    const prioritySelect = screen.getByLabelText('優先度フィルタ');
    await user.selectOptions(prioritySelect, 'all');

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.filters.priority).toBe('all');
  });

  // イベント: ステータス選択（複数）

  test('ステータスが「未着手」に変更される', async () => {
    // Given: ステータスフィルタが空配列に設定されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: ユーザーがステータスセレクトボックスで「未着手」を選択
    const statusSelect = screen.getByLabelText('ステータスフィルタ');
    await user.selectOptions(statusSelect, 'not_started');

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.filters.status).toContain('not_started');
  });

  test('ステータスが複数選択される', async () => {
    // Given: ステータスフィルタが空配列に設定されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: ユーザーがステータスセレクトボックスで「未着手」と「進行中」を選択
    const statusSelect = screen.getByLabelText('ステータスフィルタ');
    await user.selectOptions(statusSelect, ['not_started', 'in_progress']);

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.filters.status).toEqual(
      expect.arrayContaining(['not_started', 'in_progress']),
    );
  });

  test('ステータスフィルタに新しい選択肢が追加される', async () => {
    // Given: ステータスフィルタで「進行中」「レビュー中」が選択されている
    const store = createTestStore();
    store.dispatch(setStatusFilter(['in_progress', 'in_review']));

    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: ユーザーが「完了」を追加で選択
    const statusSelect = screen.getByLabelText('ステータスフィルタ');
    await user.selectOptions(statusSelect, 'completed');

    // Then: 既存の選択に「完了」が追加される
    const state = store.getState().task;
    expect(state.filters.status).toEqual(
      expect.arrayContaining(['in_progress', 'in_review', 'completed']),
    );
  });

  test('ステータスフィルタをすべて解除すると空配列がdispatchされる', async () => {
    // Given: ステータスフィルタで複数のステータスが選択されている
    const store = createTestStore();
    store.dispatch(setStatusFilter(['in_progress', 'in_review']));

    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    const statusSelect = screen.getByLabelText('ステータスフィルタ');

    // 初期状態で2つ選択されていることを確認
    expect(store.getState().task.filters.status).toEqual(
      expect.arrayContaining(['in_progress', 'in_review']),
    );

    // When: ユーザーがすべての選択を解除（空の配列を選択）
    await user.deselectOptions(statusSelect, ['in_progress', 'in_review']);

    // Then: Redux stateが空配列に更新される
    const state = store.getState().task;
    expect(state.filters.status).toEqual([]);
    expect(state.filters.status.length).toBe(0);
  });

  // Redux: フィルタ状態が更新される

  test('優先度フィルタと保存できる', async () => {
    // Given: TaskFilterコンポーネントが表示されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: フィルタを変更
    const prioritySelect = screen.getByLabelText('優先度フィルタ');
    await user.selectOptions(prioritySelect, 'high');

    // Then: state.task.filters.priorityが更新される
    const state = store.getState().task;
    expect(state.filters.priority).toBe('high');
  });

  test('ステータスフィルタを保存できる', async () => {
    // Given: TaskFilterコンポーネントが表示されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: フィルタを変更
    const statusSelect = screen.getByLabelText('ステータスフィルタ');
    await user.selectOptions(statusSelect, ['in_progress', 'in_review']);

    // Then: state.task.filters.statusが更新される
    const state = store.getState().task;
    expect(state.filters.status).toEqual(
      expect.arrayContaining(['in_progress', 'in_review']),
    );
  });

  test('優先度とステータスを同時に変更できる', async () => {
    // Given: TaskFilterコンポーネントが表示されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // When: 優先度を「高」に変更
    const prioritySelect = screen.getByLabelText('優先度フィルタ');
    await user.selectOptions(prioritySelect, 'high');

    // When: ステータスを複数選択
    const statusSelect = screen.getByLabelText('ステータスフィルタ');
    await user.selectOptions(statusSelect, ['in_progress', 'completed']);

    // Then: 両方が正しく更新される
    const state = store.getState().task;
    expect(state.filters.priority).toBe('high');
    expect(state.filters.status).toEqual(
      expect.arrayContaining(['in_progress', 'completed']),
    );
  });

  // UIスタイル

  test('優先度セレクトボックスが正しいスタイルクラスを持つ', () => {
    // Given: TaskFilterコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // Then: 優先度セレクトボックスが正しいクラスを持つ
    const prioritySelect = screen.getByLabelText('優先度フィルタ');
    expect(prioritySelect.className).toContain('px-4');
    expect(prioritySelect.className).toContain('py-2');
    expect(prioritySelect.className).toContain('border');
    expect(prioritySelect.className).toContain('rounded-lg');
  });

  test('ステータスセレクトボックスがmultiple属性を持つ', () => {
    // Given: TaskFilterコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // Then: ステータスセレクトボックスがmultiple属性を持つ
    const statusSelect = screen.getByLabelText('ステータスフィルタ');
    expect((statusSelect as HTMLSelectElement).multiple).toBe(true);
  });

  test('ラベルが正しいクラスを持つ', () => {
    // Given: TaskFilterコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // Then: ラベル要素が正しいクラスを持つ
    const labels = screen.getAllByText(/(優先度|ステータス)/);
    labels.forEach((label) => {
      expect(label.className).toContain('block');
      expect(label.className).toContain('text-sm');
      expect(label.className).toContain('font-medium');
      expect(label.className).toContain('mb-1');
    });
  });

  test('コンテナが正しいクラスを持つ', () => {
    // Given: TaskFilterコンポーネントがレンダリングされる
    const store = createTestStore();
    const { container } = render(
      <Provider store={store}>
        <TaskFilter />
      </Provider>,
    );

    // Then: コンテナが正しいクラスを持つ
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('gap-4');
    expect(wrapper.className).toContain('mb-4');
  });
});
