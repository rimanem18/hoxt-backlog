import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type {
  ITaskRepository,
  UpdateTaskInput as RepositoryUpdateInput,
} from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';

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
 * 指定されたタスクのタイトル・説明・優先度・所属projectを更新する。
 * projectIdが指定された場合はIProjectRepositoryで所有権を検証する。
 * タスクが存在しない場合はTaskNotFoundErrorをスローする。
 */
export class UpdateTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
  ) {}

  /**
   * タスクを更新する
   *
   * @param input - 更新条件（userId, taskId, data）
   * @returns 更新されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   * @throws {ProjectNotFoundError} 指定projectIdの所有権が確認できない場合
   */
  async execute(input: UpdateTaskInput): Promise<TaskEntity> {
    const task = await this.taskRepository.findById(input.userId, input.taskId);

    if (!task) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    if (input.data.projectId !== undefined) {
      const project = await this.projectRepository.findById(
        input.userId,
        input.data.projectId,
      );

      if (!project) {
        throw ProjectNotFoundError.forProjectId(input.data.projectId);
      }
    }

    if (input.data.title !== undefined) {
      task.updateTitle(input.data.title);
    }

    if (input.data.description !== undefined) {
      task.updateDescription(input.data.description);
    }

    if (input.data.priority !== undefined) {
      task.changePriority(input.data.priority);
    }

    if (input.data.projectId !== undefined) {
      task.updateProjectId(input.data.projectId);
    }

    const updatedTask = await this.taskRepository.update(
      input.userId,
      input.taskId,
      task,
    );

    // 万一の競合状態（更新直前に削除された等）に対するfail-closedのフォールバック
    if (!updatedTask) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    return updatedTask;
  }
}
