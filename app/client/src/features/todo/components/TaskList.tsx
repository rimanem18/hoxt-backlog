import type React from 'react';
import { useCallback } from 'react';
import type { TaskStatus } from '@/packages/shared-schemas/src/tasks';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { useTasks } from '../hooks/useTasks';
import { TaskItem } from './TaskItem';

/**
 * TaskListコンポーネント
 *
 * タスク一覧を表示するコンテナコンポーネント。
 * useTasks()でタスク一覧を取得し、useTaskMutations()でタスク操作を実行する。
 * ローディング、エラー、空状態の処理を行い、各タスクをTaskItemとして表示する。
 */
export const TaskList: React.FC = () => {
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

  // タスク編集ハンドラをメモ化（TaskItemの再レンダリング回避、現在は空のコールバック）
  const handleEditTask = useCallback(() => {
    /* 将来TaskEditModalを表示 */
  }, []);

  // ローディング状態
  if (isLoading) {
    return (
      <div className="text-center py-8" aria-live="polite">
        読み込み中...
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="text-center py-8 text-red-600" aria-live="assertive">
        エラーが発生しました
      </div>
    );
  }

  // 空状態
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500" aria-live="polite">
        タスクがありません
      </div>
    );
  }

  return (
    <div className="space-y-0">
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
};

TaskList.displayName = 'TaskList';
