'use client';

import React from 'react';
import type { TaskSort as TaskSortType } from '@/packages/shared-schemas/src/tasks';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSortBy } from '../store/taskSlice';

/**
 * タスクソートコンポーネント
 *
 * タスク一覧のソート順を変更するUIコンポーネント。
 * ユーザーの選択に応じてRedux stateを更新します。
 *
 * @example
 * ```tsx
 * <TaskSort />
 * ```
 */
function TaskSort(): React.ReactNode {
  const dispatch = useAppDispatch();
  const { sortBy } = useAppSelector((state) => state.task.sort);

  const sortOptions = [
    { value: 'created_at_desc' as const, label: '作成日時（新しい順）' },
    { value: 'created_at_asc' as const, label: '作成日時（古い順）' },
    { value: 'priority_desc' as const, label: '優先度（高→低）' },
  ] as const;

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as TaskSortType;
    dispatch(setSortBy(value));
  };

  return (
    <div className="mb-4 sm:mb-6">
      <label
        htmlFor="sort-select"
        className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
      >
        並び替え
      </label>
      <select
        id="sort-select"
        value={sortBy}
        onChange={handleSortChange}
        className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label="並び替えオプション"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default React.memo(TaskSort);
