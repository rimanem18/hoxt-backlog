import type React from 'react';
import { useCallback } from 'react';
import type { Task, TaskStatus } from '@/packages/shared-schemas/src/tasks';
import { useTaskServices } from '../lib/TaskServicesContext';
import TaskItem from './TaskItem';

/**
 * TaskListコンポーネント
 *
 * タスク一覧を表示するコンテナコンポーネント。
 * TaskServicesContext経由でhooksを取得し、タスク一覧の取得と操作を実行する。
 * ローディング、エラー、空状態の処理を行い、各タスクをTaskItemとして表示する。
 */
interface TaskListProps {
  /** タスク編集時のコールバック（オプション） */
  onEdit?: (task: Task) => void;
}

function TaskList(props: TaskListProps = {}): React.ReactNode {
  // Context経由でhooksを取得（テスト時にモック注入可能）
  const { useTasks, useTaskMutations } = useTaskServices();

  const { data: tasks, isLoading, error } = useTasks();
  const { deleteTask, changeStatus } = useTaskMutations();

  // タスク削除ハンドラをメモ化（TaskItemの再レンダリング回避）
  const handleDeleteTask = useCallback(
    (id: string) => {
      deleteTask.mutate(id);
    },
    [deleteTask.mutate],
  );

  // ステータス変更ハンドラをメモ化（TaskItemの再レンダリング回避）
  const handleChangeStatus = useCallback(
    (id: string, status: TaskStatus) => {
      changeStatus.mutate({ id, status });
    },
    [changeStatus.mutate],
  );

  // タスク編集ハンドラをメモ化（TaskItemの再レンダリング回避）
  const handleEditTask = useCallback(
    (task: Task) => {
      if (props.onEdit) {
        props.onEdit(task);
      }
    },
    [props.onEdit],
  );

  // ローディング状態
  if (isLoading) {
    return (
      <div
        className="text-center py-8 sm:py-12 text-sm sm:text-base"
        aria-live="polite"
      >
        読み込み中...
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div
        className="text-center py-8 sm:py-12 text-red-600 text-sm sm:text-base"
        aria-live="assertive"
      >
        エラーが発生しました
      </div>
    );
  }

  // 空状態
  if (!tasks || tasks.length === 0) {
    return (
      <div
        className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base"
        aria-live="polite"
      >
        タスクがありません
      </div>
    );
  }

  return (
    <div className="space-y-0 divide-y divide-gray-200">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onStatusChange={handleChangeStatus}
        />
      ))}
    </div>
  );
}

export default TaskList;
