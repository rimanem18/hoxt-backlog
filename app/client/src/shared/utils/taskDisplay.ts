import {
  type TaskPriority,
  type TaskStatus,
  taskPriorityLabels,
  taskStatusLabels,
} from '@hoxt-backlog/shared-schemas/tasks';

interface TaskDisplay {
  label: string;
  className: string;
}

const priorityClassNameMap: Record<TaskPriority, string> = {
  high: 'text-accent font-bold',
  medium: 'text-gray-700',
  low: 'text-gray-400',
};

const statusClassNameMap: Record<TaskStatus, string> = {
  not_started: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-200 text-blue-700',
  in_review: 'bg-yellow-200 text-yellow-700',
  completed: 'bg-green-200 text-green-700',
};

const DEFAULT_PRIORITY_CLASS_NAME = 'text-gray-700';
const DEFAULT_STATUS_CLASS_NAME = 'bg-gray-200 text-gray-700';

/**
 * タスク優先度の表示ラベル・スタイルを取得する
 *
 * 閲覧者向けDTOのpriorityは型付きenumではなく生文字列のため、
 * 未知値は入力値そのものをラベルにフォールバックする
 */
export function getTaskPriorityDisplay(priority: string): TaskDisplay {
  const key = priority as TaskPriority;
  return {
    label: taskPriorityLabels[key] ?? priority,
    className: priorityClassNameMap[key] ?? DEFAULT_PRIORITY_CLASS_NAME,
  };
}

/**
 * タスクステータスの表示ラベル・スタイルを取得する
 *
 * 閲覧者向けDTOのstatusは型付きenumではなく生文字列のため、
 * 未知値は入力値そのものをラベルにフォールバックする
 */
export function getTaskStatusDisplay(status: string): TaskDisplay {
  const key = status as TaskStatus;
  return {
    label: taskStatusLabels[key] ?? status,
    className: statusClassNameMap[key] ?? DEFAULT_STATUS_CLASS_NAME,
  };
}
