import type { TaskEntity } from '@/task/domain/TaskEntity';

/**
 * タスク更新ユースケースの更新データ
 */
export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  priority?: string;
  projectId?: string;
}

/**
 * タスク更新ユースケースの入力データ
 */
export interface UpdateTaskInput {
  /** 認証済みユーザーID */
  userId: string;
  /** 更新対象のタスクID */
  taskId: string;
  /** 更新データ */
  data: UpdateTaskData;
}

/**
 * タスク更新ユースケース
 */
export interface IUpdateTaskUseCase {
  /**
   * タスクを更新する
   *
   * @param input - 更新条件（userId, taskId, data）
   * @returns 更新されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   * @throws {ProjectNotFoundError} 指定projectIdの所有権が確認できない場合
   */
  execute(input: UpdateTaskInput): Promise<TaskEntity>;
}
