import type {
  ITaskRepository,
  TaskFilters,
  TaskSortBy,
} from '@/domain/task/ITaskRepository';
import type { TaskEntity } from '@/domain/task/TaskEntity';

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
 */
export class GetTasksUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスク一覧を取得する
   *
   * @param input - 取得条件（userId, filters, sort）
   * @returns フィルタ・ソート適用後のTaskEntity配列
   */
  async execute(input: GetTasksInput): Promise<TaskEntity[]> {
    return await this.taskRepository.findByUserId(
      input.userId,
      input.filters,
      input.sort,
    );
  }
}
