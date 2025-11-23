import type { ITaskRepository } from '@/domain/task/ITaskRepository';
import { TaskEntity } from '@/domain/task/TaskEntity';

/**
 * タスク作成ユースケースの入力データ
 */
export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: string;
}

/**
 * タスク作成ユースケース
 *
 * ログイン済みユーザーが新規タスクを作成する。
 * TaskEntityのファクトリメソッドでバリデーションを行い、
 * ITaskRepositoryを通じて永続化する。
 */
export class CreateTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスクを作成する
   *
   * @param input - タスク作成に必要な入力データ
   * @returns 作成されたTaskEntity
   * @throws {InvalidTaskDataError} タイトルや優先度が不正な場合
   */
  async execute(input: CreateTaskInput): Promise<TaskEntity> {
    // TaskEntity.create()でバリデーションとエンティティ生成
    // undefinedのプロパティは渡さない（exactOptionalPropertyTypes対応）
    const task = TaskEntity.create({
      userId: input.userId,
      title: input.title,
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.priority !== undefined && { priority: input.priority }),
    });

    // リポジトリで永続化
    return await this.taskRepository.save(task);
  }
}
