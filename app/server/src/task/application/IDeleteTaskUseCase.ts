/**
 * タスク削除ユースケースの入力データ
 */
export interface DeleteTaskInput {
  userId: string;
  taskId: string;
}

/**
 * タスク削除ユースケース
 */
export interface IDeleteTaskUseCase {
  /**
   * タスクを削除する
   *
   * @param input - タスク削除に必要な入力データ
   * @returns Promise<void> - 削除成功時は何も返さない
   * @throws {InvalidTaskDataError} 入力データが不正な場合
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  execute(input: DeleteTaskInput): Promise<void>;
}
