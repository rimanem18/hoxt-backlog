import { TaskDomainError } from './TaskDomainError';

/**
 * 不正タスクデータエラー
 *
 * タスクのデータが不正な場合にスローされる。
 * HTTPステータス400に対応。
 */
export class InvalidTaskDataError extends TaskDomainError {
  readonly code = 'INVALID_TASK_DATA';
}
