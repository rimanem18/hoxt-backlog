import { TaskNotFoundError } from '@/domain/task/errors/TaskNotFoundError';
import type {
  ITaskRepository,
  UpdateTaskInput as RepositoryUpdateInput,
} from '@/domain/task/ITaskRepository';
import type { TaskEntity } from '@/domain/task/TaskEntity';

/**
 * タスク更新ユースケースの入力データ
 */
export interface UpdateTaskInput {
  /** 認証済みユーザーID */
  userId: string;
  /** 更新対象のタスクID */
  taskId: string;
  /** 更新データ */
  data: RepositoryUpdateInput;
}

/**
 * タスク更新ユースケース
 *
 * 指定されたタスクのタイトル・説明・優先度を更新する。
 * タスクが存在しない場合はTaskNotFoundErrorをスローする。
 */
export class UpdateTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスクを更新する
   *
   * @param input - 更新条件（userId, taskId, data）
   * @returns 更新されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  async execute(input: UpdateTaskInput): Promise<TaskEntity> {
    const task = await this.taskRepository.update(
      input.userId,
      input.taskId,
      input.data,
    );

    if (!task) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    return task;
  }
}
