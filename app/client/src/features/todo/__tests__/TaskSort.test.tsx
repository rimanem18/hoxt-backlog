import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import TaskSort from '../components/TaskSort';
import taskReducer, { setSortBy } from '../store/taskSlice';

describe('TaskSort', () => {
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

  // 正常系: ソートが表示される

  test('ソートセレクトボックスが表示される', () => {
    // Given: TaskSortコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // Then: ソートセレクトボックスが表示される
    const sortSelect = screen.getByLabelText('並び替えオプション');
    expect(sortSelect).toBeInTheDocument();
    expect(sortSelect.tagName).toBe('SELECT');
  });

  test('ラベルが表示される', () => {
    // Given: TaskSortコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // Then: ラベルが表示される
    expect(screen.getByText('並び替え')).toBeInTheDocument();
  });

  test('デフォルト値が選択されている', () => {
    // Given: TaskSortコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // Then: デフォルト値「作成日時（新しい順）」が選択されている
    const sortSelect = screen.getByLabelText(
      '並び替えオプション',
    ) as HTMLSelectElement;
    expect(sortSelect.value).toBe('created_at_desc');
  });

  // イベント: ソート選択

  test('ソート順が「作成日時（古い順）」に変更される', async () => {
    // Given: ソート順が「作成日時（新しい順）」に設定されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // When: ユーザーがソートセレクトボックスで「作成日時（古い順）」を選択
    const sortSelect = screen.getByLabelText('並び替えオプション');
    await user.selectOptions(sortSelect, 'created_at_asc');

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.sort.sortBy).toBe('created_at_asc');
  });

  test('ソート順が「優先度（高→低）」に変更される', async () => {
    // Given: ソート順が「作成日時（新しい順）」に設定されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // When: ユーザーがソートセレクトボックスで「優先度（高→低）」を選択
    const sortSelect = screen.getByLabelText('並び替えオプション');
    await user.selectOptions(sortSelect, 'priority_desc');

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.sort.sortBy).toBe('priority_desc');
  });

  test('ソート順が「作成日時（新しい順）」に戻される', async () => {
    // Given: ソート順が「優先度（高→低）」に設定されている
    const store = createTestStore();
    store.dispatch(setSortBy('priority_desc'));

    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // When: ユーザーが「作成日時（新しい順）」を選択
    const sortSelect = screen.getByLabelText('並び替えオプション');
    await user.selectOptions(sortSelect, 'created_at_desc');

    // Then: Redux stateが更新される
    const state = store.getState().task;
    expect(state.sort.sortBy).toBe('created_at_desc');
  });

  test('同じソート順を再選択しても状態は更新される', async () => {
    // Given: ソート順が「作成日時（新しい順）」に設定されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // When: ユーザーが再度「作成日時（新しい順）」を選択
    const sortSelect = screen.getByLabelText('並び替えオプション');
    await user.selectOptions(sortSelect, 'created_at_desc');

    // Then: Redux stateは変わらない（冪等性）
    const state = store.getState().task;
    expect(state.sort.sortBy).toBe('created_at_desc');
  });

  // Redux: ソート状態が更新される

  test('ソート順を変更するとsortByが更新される', async () => {
    // Given: TaskSortコンポーネントが表示されている
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // When: ソート順を変更
    const sortSelect = screen.getByLabelText('並び替えオプション');
    await user.selectOptions(sortSelect, 'priority_desc');

    // Then: state.task.sort.sortByが更新される
    const state = store.getState().task;
    expect(state.sort.sortBy).toBe('priority_desc');
  });

  // UIスタイル

  test('ソートセレクトボックスが正しいスタイルクラスを持つ', () => {
    // Given: TaskSortコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // Then: ソートセレクトボックスが正しいクラスを持つ
    const sortSelect = screen.getByLabelText('並び替えオプション');
    expect(sortSelect.className).toContain('px-4');
    expect(sortSelect.className).toContain('py-2');
    expect(sortSelect.className).toContain('border');
    expect(sortSelect.className).toContain('rounded-lg');
  });

  test('ラベルが正しいクラスを持つ', () => {
    // Given: TaskSortコンポーネントがレンダリングされる
    const store = createTestStore();
    render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // Then: ラベル要素が正しいクラスを持つ
    const label = screen.getByText('並び替え');
    expect(label.className).toContain('block');
    expect(label.className).toContain('text-sm');
    expect(label.className).toContain('font-medium');
    expect(label.className).toContain('mb-1');
  });

  test('コンテナが正しいクラスを持つ', () => {
    // Given: TaskSortコンポーネントがレンダリングされる
    const store = createTestStore();
    const { container } = render(
      <Provider store={store}>
        <TaskSort />
      </Provider>,
    );

    // Then: コンテナが正しいクラスを持つ
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('mb-4');
  });
});
