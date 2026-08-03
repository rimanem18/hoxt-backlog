import type { TaskEntity } from '@/task/domain/TaskEntity';

/**
 * タスク作成ユースケースの入力データ
 */
export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: string;
  projectId: string;
}

/**
 * タスク作成ユースケース
 */
export interface ICreateTaskUseCase {
  /**
   * タスクを作成する
   *
   * @param input - タスク作成に必要な入力データ
   * @returns 作成されたTaskEntity
   * @throws {InvalidTaskDataError} タイトルや優先度が不正な場合
   * @throws {ProjectNotFoundError} 指定projectIdの所有権が確認できない場合
   */
  execute(input: CreateTaskInput): Promise<TaskEntity>;
}
