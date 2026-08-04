import type { TaskEntity } from '@/task/domain/TaskEntity';

/**
 * ステータス変更の入力パラメータ
 */
export interface ChangeTaskStatusInput {
  /** 認証済みユーザーID */
  userId: string;
  /** 変更対象のタスクID */
  taskId: string;
  /** 新しいステータス */
  status: string;
}

/**
 * タスクステータス変更ユースケース
 */
export interface IChangeTaskStatusUseCase {
  /**
   * タスクステータスを変更する
   *
   * @param input - 変更条件（userId, taskId, status）
   * @returns 更新されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  execute(input: ChangeTaskStatusInput): Promise<TaskEntity>;
}
