'use client';

import React from 'react';
import type {
  TaskPriority,
  TaskStatus,
} from '@/packages/shared-schemas/src/tasks';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setPriorityFilter, setStatusFilter } from '../store/taskSlice';

/**
 * タスクフィルタコンポーネント
 *
 * 優先度フィルタとステータスフィルタを提供するコンポーネント。
 * ユーザーの選択に応じてRedux stateを更新し、タスク一覧をフィルタリングします。
 *
 * @example
 * ```tsx
 * <TaskFilter />
 * ```
 */
function TaskFilter(): React.ReactNode {
  const dispatch = useAppDispatch();
  const { priority, status } = useAppSelector((state) => state.task.filters);

  const priorityOptions = [
    { value: 'all' as const, label: 'すべて' },
    { value: 'high' as const, label: '高' },
    { value: 'medium' as const, label: '中' },
    { value: 'low' as const, label: '低' },
  ] as const;

  const statusOptions = [
    { value: 'not_started' as const, label: '未着手' },
    { value: 'in_progress' as const, label: '進行中' },
    { value: 'in_review' as const, label: 'レビュー中' },
    { value: 'completed' as const, label: '完了' },
  ] as const;

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as TaskPriority | 'all';
    dispatch(setPriorityFilter(value));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValues = Array.from(
      e.target.selectedOptions,
      (option) => option.value as TaskStatus,
    );
    dispatch(setStatusFilter(selectedValues));
  };

  return (
    <div className="flex gap-4 mb-4">
      <div>
        <label
          htmlFor="priority-filter"
          className="block text-sm font-medium mb-1"
        >
          優先度
        </label>
        <select
          id="priority-filter"
          value={priority}
          onChange={handlePriorityChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
          aria-label="優先度フィルタ"
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="status-filter"
          className="block text-sm font-medium mb-1"
        >
          ステータス
        </label>
        <select
          id="status-filter"
          multiple
          value={status}
          onChange={handleStatusChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
          aria-label="ステータスフィルタ"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default React.memo(TaskFilter);
