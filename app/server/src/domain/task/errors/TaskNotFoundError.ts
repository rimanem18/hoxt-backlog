import { TaskDomainError } from './TaskDomainError';

/**
 * タスク不存在エラー
 *
 * 指定されたタスクIDでタスクが見つからない場合にスローされる。
 * HTTPステータス404に対応。
 */
export class TaskNotFoundError extends TaskDomainError {
  readonly code = 'TASK_NOT_FOUND';

  /**
   * タスク不存在エラーを初期化する
   * @param taskId - 見つからなかったタスクID
   */
  constructor(taskId: string) {
    super(`タスクが見つかりません: ${taskId}`);
  }

  /**
   * タスクIDによる不存在エラーを作成する
   * @param taskId - 見つからなかったタスクID
   * @returns TaskNotFoundErrorインスタンス
   */
  static forTaskId(taskId: string): TaskNotFoundError {
    return new TaskNotFoundError(taskId);
  }
}
