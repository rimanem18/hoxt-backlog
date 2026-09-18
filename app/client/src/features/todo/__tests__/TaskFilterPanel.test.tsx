import { afterEach, describe, expect, mock, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import TaskFilterPanel from '../components/TaskFilterPanel';
import taskReducer, {
  setPriorityFilter,
  setSortBy,
  setStatusFilter,
} from '../store/taskSlice';

describe('TaskFilterPanel', () => {
  const createTestStore = () =>
    configureStore({
      reducer: {
        task: taskReducer,
      },
    });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('projectIdが変わるとフィルタ・ソートが初期状態に戻る', () => {
    // Given: 非初期状態のフィルタ・ソートを持つストアで、projectId="project-a"としてマウント済み
    const store = createTestStore();
    store.dispatch(setPriorityFilter('high'));
    store.dispatch(setStatusFilter(['in_progress']));
    store.dispatch(setSortBy('priority_desc'));
    const { rerender } = render(
      <Provider store={store}>
        <TaskFilterPanel projectId="project-a" />
      </Provider>,
    );
    // マウント時リセットと区別するため、マウント後に再度非初期状態へ戻す
    store.dispatch(setPriorityFilter('high'));
    store.dispatch(setStatusFilter(['in_progress']));
    store.dispatch(setSortBy('priority_desc'));

    // When: projectIdを"project-b"に変更して再レンダリング
    rerender(
      <Provider store={store}>
        <TaskFilterPanel projectId="project-b" />
      </Provider>,
    );

    // Then: フィルタ・ソートが初期状態に戻る
    const state = store.getState().task;
    expect(state.filters.priority).toBe('all');
    expect(state.filters.status).toEqual([]);
    expect(state.sort.sortBy).toBe('created_at_desc');
  });

  test('マウント時点でフィルタ・ソートが初期状態になる', () => {
    // Given: 非初期状態のフィルタ・ソートを持つストア
    const store = createTestStore();
    store.dispatch(setPriorityFilter('high'));
    store.dispatch(setStatusFilter(['in_progress']));
    store.dispatch(setSortBy('priority_desc'));

    // When: TaskFilterPanelをマウントする
    render(
      <Provider store={store}>
        <TaskFilterPanel projectId="project-a" />
      </Provider>,
    );

    // Then: フィルタ・ソートが初期状態になる
    const state = store.getState().task;
    expect(state.filters.priority).toBe('all');
    expect(state.filters.status).toEqual([]);
    expect(state.sort.sortBy).toBe('created_at_desc');
  });

  test('絞り込み・並び替えUIが描画される', () => {
    // Given: 初期状態のストア
    const store = createTestStore();

    // When: TaskFilterPanelをレンダリングする
    render(
      <Provider store={store}>
        <TaskFilterPanel projectId="project-a" />
      </Provider>,
    );

    // Then: 絞り込み・並び替えのUIが表示される
    expect(screen.getByLabelText('優先度フィルタ')).toBeInTheDocument();
    expect(screen.getByLabelText('並び替えオプション')).toBeInTheDocument();
  });
});
