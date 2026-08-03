import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
import type {
  GetTaskByIdInput,
  IGetTaskByIdUseCase,
} from './IGetTaskByIdUseCase';

/**
 * タスク詳細取得ユースケース
 *
 * 指定されたタスクIDに基づいて単一のタスク詳細情報を取得する。
 * タスクが存在しない場合はTaskNotFoundErrorをスローする。
 */
export class GetTaskByIdUseCase implements IGetTaskByIdUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスク詳細を取得する
   *
   * @param input - 取得条件（userId, taskId）
   * @returns 取得されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  async execute(input: GetTaskByIdInput): Promise<TaskEntity> {
    const task = await this.taskRepository.findById(input.userId, input.taskId);

    if (!task) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    return task;
  }
}
