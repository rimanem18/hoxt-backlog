import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
import type {
  ChangeTaskStatusInput,
  IChangeTaskStatusUseCase,
} from './IChangeTaskStatusUseCase';

/**
 * タスクステータス変更ユースケース
 *
 * タスクのステータスを変更する。
 * タイトルや説明の更新とは独立して、ステータスのみを効率的に変更する。
 */
export class ChangeTaskStatusUseCase implements IChangeTaskStatusUseCase {
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
