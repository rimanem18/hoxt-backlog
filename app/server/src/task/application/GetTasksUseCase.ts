import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type {
  ITaskRepository,
  TaskFilters,
  TaskSortBy,
} from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';

/**
 * タスク一覧取得ユースケースの入力
 */
export interface GetTasksInput {
  userId: string;
  filters: TaskFilters;
  sort: TaskSortBy;
}

/**
 * タスク一覧取得ユースケース
 *
 * ユーザーが所有するタスクをフィルタ・ソート条件に従って取得する。
 * projectIdフィルタが指定された場合はIProjectRepositoryで所有権を検証する。
 */
export class GetTasksUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
  ) {}

  /**
   * タスク一覧を取得する
   *
   * @param input - 取得条件（userId, filters, sort）
   * @returns フィルタ・ソート適用後のTaskEntity配列
   * @throws {ProjectNotFoundError} 指定projectIdの所有権が確認できない場合
   */
  async execute(input: GetTasksInput): Promise<TaskEntity[]> {
    if (input.filters.projectId !== undefined) {
      const project = await this.projectRepository.findById(
        input.userId,
        input.filters.projectId,
      );

      if (!project) {
        throw ProjectNotFoundError.forProjectId(input.filters.projectId);
      }
    }

    return await this.taskRepository.findByUserId(
      input.userId,
      input.filters,
      input.sort,
    );
  }
}
