import type { Task, TaskStatus } from '@hoxt-backlog/shared-schemas/tasks';
import React from 'react';
import TaskSummary from '@/shared/components/TaskSummary';

/**
 * TaskItemコンポーネント
 *
 * タスク一覧内の個別タスク表示を担当するプレゼンテーションコンポーネント。
 * タスク情報（タイトル、説明、優先度、ステータス）の表示と
 * 編集・削除・ステータス変更操作のコールバック呼び出しを提供。
 * ビジネスロジックは親コンポーネント（TaskList）が担当。
 */

interface TaskItemProps {
  /** 表示するタスク情報 */
  task: Task;
  /** 編集ボタンクリック時のコールバック */
  onEdit: (task: Task) => void;
  /** 削除ボタンクリック時のコールバック */
  onDelete: (id: string) => void;
  /** ステータス変更時のコールバック（型安全性を確保） */
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function TaskItem(props: TaskItemProps): React.ReactNode {
  /**
   * ステータス変更ハンドラ
   * 同じ値の場合は親コンポーネントへ通知しない（不要なAPI呼び出しを回避）
   */
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TaskStatus;
    if (newStatus !== props.task.status) {
      props.onStatusChange(props.task.id, newStatus);
    }
  };

  return (
    <div className="border-l-4 border-primary bg-white p-4 sm:p-5 md:p-6 hover:bg-gray-50 transition-colors">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
        <TaskSummary
          title={props.task.title}
          description={props.task.description}
          priority={props.task.priority}
          status={props.task.status}
        />

        {/* ステータス変更、編集、削除の操作ボタン */}
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
          {/* ステータス選択ドロップダウン */}
          <select
            value={props.task.status}
            onChange={handleStatusChange}
            aria-label="ステータスを変更"
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="not_started">未着手</option>
            <option value="in_progress">進行中</option>
            <option value="in_review">レビュー中</option>
            <option value="completed">完了</option>
          </select>

          {/* 編集ボタン。ホバー時はアクセントカラー */}
          <button
            type="button"
            onClick={() => props.onEdit(props.task)}
            aria-label="タスクを編集"
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-700 hover:text-accent transition-colors whitespace-nowrap"
          >
            編集
          </button>

          {/* 削除ボタン。ベースカラーの背景 */}
          <button
            type="button"
            onClick={() => props.onDelete(props.task.id)}
            aria-label="タスクを削除"
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-white bg-primary hover:bg-opacity-80 rounded transition-colors whitespace-nowrap"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(TaskItem);
