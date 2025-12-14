import type React from 'react';
import { useCallback } from 'react';
import type { TaskStatus } from '@/packages/shared-schemas/src/tasks';
import { useTaskServices } from '../lib/TaskServicesContext';
import TaskItem from './TaskItem';

/**
 * TaskListコンポーネント
 *
 * タスク一覧を表示するコンテナコンポーネント。
 * TaskServicesContext経由でhooksを取得し、タスク一覧の取得と操作を実行する。
 * ローディング、エラー、空状態の処理を行い、各タスクをTaskItemとして表示する。
 */
function TaskList(): React.ReactNode {
  // Context経由でhooksを取得（テスト時にモック注入可能）
  // 注意: 変数名を`use`で始めることでESLintの静的解析を維持
  const { useTasks: useTasksHook, useTaskMutations: useTaskMutationsHook } =
    useTaskServices();

  const { data: tasks, isLoading, error } = useTasksHook();
  const { deleteTask, changeStatus } = useTaskMutationsHook();

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
}

export default TaskList;
