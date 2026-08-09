import type { TaskEntity } from '@/task/domain/TaskEntity';

/**
 * タスク詳細取得ユースケースの入力データ
 */
export interface GetTaskByIdInput {
  /** 認証済みユーザーID */
  userId: string;
  /** 取得対象のタスクID */
  taskId: string;
}

/**
 * タスク詳細取得ユースケース
 */
export interface IGetTaskByIdUseCase {
  /**
   * タスク詳細を取得する
   *
   * @param input - 取得条件（userId, taskId）
   * @returns 取得されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  execute(input: GetTaskByIdInput): Promise<TaskEntity>;
}
