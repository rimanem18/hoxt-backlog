import { InvalidTaskDataError } from '@/domain/task/errors/InvalidTaskDataError';
import { TaskNotFoundError } from '@/domain/task/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/domain/task/ITaskRepository';

/**
 * タスク削除ユースケースの入力データ
 */
export interface DeleteTaskInput {
  userId: string;
  taskId: string;
}

/**
 * タスク削除ユースケース
 *
 * ログイン済みユーザーが自分のタスクを物理削除する。
 * ITaskRepositoryを通じて削除を実行し、削除失敗時はエラーをスローする。
 */
export class DeleteTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスクを削除する
   *
   * @param input - タスク削除に必要な入力データ
   * @returns Promise<void> - 削除成功時は何も返さない
   * @throws {InvalidTaskDataError} 入力データが不正な場合
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  async execute(input: DeleteTaskInput): Promise<void> {
    if (!input.userId?.trim() || !input.taskId?.trim()) {
      throw new InvalidTaskDataError(
        'userId and taskId must be non-empty strings',
      );
    }

    const deleted = await this.taskRepository.delete(
      input.userId,
      input.taskId,
    );

    if (!deleted) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }
  }
}
