import type { TaskFilters, TaskSortBy } from '@/task/domain/ITaskRepository';
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
 */
export interface IGetTasksUseCase {
  /**
   * タスク一覧を取得する
   *
   * @param input - 取得条件（userId, filters, sort）
   * @returns フィルタ・ソート適用後のTaskEntity配列
   * @throws {ProjectNotFoundError} 指定projectIdの所有権が確認できない場合
   */
  execute(input: GetTasksInput): Promise<TaskEntity[]>;
}
