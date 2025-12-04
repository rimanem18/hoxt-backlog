/**
 * タスク一覧のUIフィルタ・ソート状態を管理するRedux Slice
 *
 * Redux ToolkitのcreateSliceを使用してタスクフィルタリング・ソート状態を管理します。
 * サーバー状態（タスクデータ）はTanStack Queryで管理し、UI状態のみをReduxで管理します。
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  TaskPriority,
  TaskStatus,
} from '@/packages/shared-schemas/src/tasks';

/**
 * タスクフィルタの状態
 */
export interface TaskFilterState {
  /** 優先度フィルタ（'all'はフィルタなし） */
  priority: TaskPriority | 'all';
  /** ステータスフィルタ（空配列はフィルタなし） */
  status: TaskStatus[];
}

/**
 * タスクソートの状態
 */
export interface TaskSortState {
  /** ソート順（作成日時降順/昇順、優先度降順） */
  sortBy: 'created_at_desc' | 'created_at_asc' | 'priority_desc';
}

/**
 * taskSliceの状態
 */
export interface TaskSliceState {
  /** フィルタ状態 */
  filters: TaskFilterState;
  /** ソート状態 */
  sort: TaskSortState;
}

/**
 * 初期状態
 * デフォルトではフィルタなし、作成日時降順でソート
 */
const initialState: TaskSliceState = {
  filters: {
    priority: 'all',
    status: [],
  },
  sort: {
    sortBy: 'created_at_desc',
  },
};

/**
 * タスクUIフィルタ・ソート状態管理のRedux slice
 */
export const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    /**
     * 優先度フィルタを設定
     * @param state 現在の状態
     * @param action 設定する優先度（'all'の場合はフィルタ解除）
     */
    setPriorityFilter: (state, action: PayloadAction<TaskPriority | 'all'>) => {
      state.filters.priority = action.payload;
    },
    /**
     * ステータスフィルタを設定（複数選択可能）
     * @param state 現在の状態
     * @param action 設定するステータス配列（空配列の場合はフィルタ解除）
     */
    setStatusFilter: (state, action: PayloadAction<TaskStatus[]>) => {
      state.filters.status = action.payload;
    },
    /**
     * ソート順を設定
     * @param state 現在の状態
     * @param action 設定するソート順
     */
    setSortBy: (state, action: PayloadAction<TaskSortState['sortBy']>) => {
      state.sort.sortBy = action.payload;
    },
    /**
     * フィルタ・ソート状態を初期状態にリセット
     * @param state 現在の状態
     */
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.sort = initialState.sort;
    },
  },
});

export const { setPriorityFilter, setStatusFilter, setSortBy, resetFilters } =
  taskSlice.actions;
export default taskSlice.reducer;
