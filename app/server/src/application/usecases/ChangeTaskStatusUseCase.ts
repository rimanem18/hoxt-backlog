import { TaskNotFoundError } from '@/domain/task/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/domain/task/ITaskRepository';
import type { TaskEntity } from '@/domain/task/TaskEntity';

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
 *
 * タスクのステータスを変更する。
 * タイトルや説明の更新とは独立して、ステータスのみを効率的に変更する。
 */
export class ChangeTaskStatusUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスクステータスを変更する
   *
   * @param input - 変更条件（userId, taskId, status）
   * @returns 更新されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  async execute(input: ChangeTaskStatusInput): Promise<TaskEntity> {
    const task = await this.taskRepository.updateStatus(
      input.userId,
      input.taskId,
      input.status,
    );

    if (!task) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    return task;
  }
}
