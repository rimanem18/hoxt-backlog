import { TaskDomainError } from './TaskDomainError';

/**
 * タスクアクセス拒否エラー
 *
 * タスクへのアクセス権限がない場合にスローされる。
 * HTTPステータス403に対応。
 */
export class TaskAccessDeniedError extends TaskDomainError {
  readonly code = 'TASK_ACCESS_DENIED';

  /**
   * タスクアクセス拒否エラーを初期化する
   * @param taskId - アクセス拒否されたタスクID
   */
  constructor(taskId: string) {
    super(`このタスクにアクセスする権限がありません: ${taskId}`);
  }

  /**
   * タスクIDによるアクセス拒否エラーを作成する
   * @param taskId - アクセス拒否されたタスクID
   * @returns TaskAccessDeniedErrorインスタンス
   */
  static forTaskId(taskId: string): TaskAccessDeniedError {
    return new TaskAccessDeniedError(taskId);
  }
}
