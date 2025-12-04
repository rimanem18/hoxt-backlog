import { describe, expect, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import {
  resetFilters,
  setPriorityFilter,
  setSortBy,
  setStatusFilter,
  taskSlice,
} from '../taskSlice';

describe('taskSlice', () => {
  const createTestStore = () =>
    configureStore({
      reducer: {
        task: taskSlice.reducer,
      },
    });

  describe('初期状態', () => {
    test('初期状態が正しく設定される', () => {
      // Given: 新しいストアを作成
      const store = createTestStore();

      // When: 初期状態を取得
      const state = store.getState().task;

      // Then: 初期状態が期待値と一致
      expect(state.filters.priority).toBe('all');
      expect(state.filters.status).toEqual([]);
      expect(state.sort.sortBy).toBe('created_at_desc');
    });
  });

  describe('setPriorityFilter', () => {
    test('優先度フィルタを"high"に変更できる', () => {
      // Given: 初期状態のストア
      const store = createTestStore();

      // When: 優先度フィルタを"high"に設定
      store.dispatch(setPriorityFilter('high'));

      // Then: 優先度フィルタが"high"に更新される
      const state = store.getState().task;
      expect(state.filters.priority).toBe('high');
    });

    test('優先度フィルタを"medium"に変更できる', () => {
      // Given: 初期状態のストア
      const store = createTestStore();

      // When: 優先度フィルタを"medium"に設定
      store.dispatch(setPriorityFilter('medium'));

      // Then: 優先度フィルタが"medium"に更新される
      const state = store.getState().task;
      expect(state.filters.priority).toBe('medium');
    });

    test('優先度フィルタを"low"に変更できる', () => {
      // Given: 初期状態のストア
      const store = createTestStore();

      // When: 優先度フィルタを"low"に設定
      store.dispatch(setPriorityFilter('low'));

      // Then: 優先度フィルタが"low"に更新される
      const state = store.getState().task;
      expect(state.filters.priority).toBe('low');
    });

    test('優先度フィルタを"all"にリセットできる', () => {
      // Given: 優先度フィルタが"high"に設定されたストア
      const store = createTestStore();
      store.dispatch(setPriorityFilter('high'));

      // When: 優先度フィルタを"all"に設定
      store.dispatch(setPriorityFilter('all'));

      // Then: 優先度フィルタが"all"に更新される
      const state = store.getState().task;
      expect(state.filters.priority).toBe('all');
    });
  });

  describe('setStatusFilter', () => {
    test('ステータスフィルタを単一ステータスに設定できる', () => {
      // Given: 初期状態のストア
      const store = createTestStore();

      // When: ステータスフィルタを["in_progress"]に設定
      store.dispatch(setStatusFilter(['in_progress']));

      // Then: ステータスフィルタが["in_progress"]に更新される
      const state = store.getState().task;
      expect(state.filters.status).toEqual(['in_progress']);
    });

    test('ステータスフィルタを複数ステータスに設定できる', () => {
      // Given: 初期状態のストア
      const store = createTestStore();

      // When: ステータスフィルタを["in_progress", "in_review"]に設定
      store.dispatch(setStatusFilter(['in_progress', 'in_review']));

      // Then: ステータスフィルタが["in_progress", "in_review"]に更新される
      const state = store.getState().task;
      expect(state.filters.status).toEqual(['in_progress', 'in_review']);
    });

    test('ステータスフィルタを空配列に設定できる', () => {
      // Given: ステータスフィルタが設定されたストア
      const store = createTestStore();
      store.dispatch(setStatusFilter(['in_progress']));

      // When: ステータスフィルタを[]に設定
      store.dispatch(setStatusFilter([]));

      // Then: ステータスフィルタが[]に更新される
      const state = store.getState().task;
      expect(state.filters.status).toEqual([]);
    });

    test('すべてのステータスを設定できる', () => {
      // Given: 初期状態のストア
      const store = createTestStore();

      // When: すべてのステータスを設定
      store.dispatch(
        setStatusFilter([
          'not_started',
          'in_progress',
          'in_review',
          'completed',
        ]),
      );

      // Then: すべてのステータスが設定される
      const state = store.getState().task;
      expect(state.filters.status).toEqual([
        'not_started',
        'in_progress',
        'in_review',
        'completed',
      ]);
    });
  });

  describe('setSortBy', () => {
    test('ソート順を"created_at_asc"に変更できる', () => {
      // Given: 初期状態のストア
      const store = createTestStore();

      // When: ソート順を"created_at_asc"に設定
      store.dispatch(setSortBy('created_at_asc'));

      // Then: ソート順が"created_at_asc"に更新される
      const state = store.getState().task;
      expect(state.sort.sortBy).toBe('created_at_asc');
    });

    test('ソート順を"priority_desc"に変更できる', () => {
      // Given: 初期状態のストア
      const store = createTestStore();

      // When: ソート順を"priority_desc"に設定
      store.dispatch(setSortBy('priority_desc'));

      // Then: ソート順が"priority_desc"に更新される
      const state = store.getState().task;
      expect(state.sort.sortBy).toBe('priority_desc');
    });

    test('ソート順を"created_at_desc"に戻せる', () => {
      // Given: ソート順が"priority_desc"に設定されたストア
      const store = createTestStore();
      store.dispatch(setSortBy('priority_desc'));

      // When: ソート順を"created_at_desc"に設定
      store.dispatch(setSortBy('created_at_desc'));

      // Then: ソート順が"created_at_desc"に更新される
      const state = store.getState().task;
      expect(state.sort.sortBy).toBe('created_at_desc');
    });
  });

  describe('resetFilters', () => {
    test('すべてのフィルタとソートを初期状態にリセットできる', () => {
      // Given: フィルタ・ソートが設定されたストア
      const store = createTestStore();
      store.dispatch(setPriorityFilter('high'));
      store.dispatch(setStatusFilter(['in_progress', 'in_review']));
      store.dispatch(setSortBy('priority_desc'));

      // When: リセットアクションを実行
      store.dispatch(resetFilters());

      // Then: すべてのフィルタ・ソートが初期状態に戻る
      const state = store.getState().task;
      expect(state.filters.priority).toBe('all');
      expect(state.filters.status).toEqual([]);
      expect(state.sort.sortBy).toBe('created_at_desc');
    });
  });
});
