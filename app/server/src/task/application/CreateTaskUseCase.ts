import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import { TaskEntity } from '@/task/domain/TaskEntity';
import type { CreateTaskInput, ICreateTaskUseCase } from './ICreateTaskUseCase';

/**
 * タスク作成ユースケース
 *
 * ログイン済みユーザーが新規タスクを作成する。
 * IProjectRepositoryでprojectの所有権を検証したうえで、
 * TaskEntityのファクトリメソッドでバリデーションを行い、
 * ITaskRepositoryを通じて永続化する。
 */
export class CreateTaskUseCase implements ICreateTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
  ) {}

  /**
   * タスクを作成する
   *
   * @param input - タスク作成に必要な入力データ
   * @returns 作成されたTaskEntity
   * @throws {InvalidTaskDataError} タイトルや優先度が不正な場合
   * @throws {ProjectNotFoundError} 指定projectIdの所有権が確認できない場合
   */
  async execute(input: CreateTaskInput): Promise<TaskEntity> {
    const project = await this.projectRepository.findById(
      input.userId,
      input.projectId,
    );

    if (!project) {
      throw ProjectNotFoundError.forProjectId(input.projectId);
    }

    // TaskEntity.create()でバリデーションとエンティティ生成
    // undefinedのプロパティは渡さない（exactOptionalPropertyTypes対応）
    const task = TaskEntity.create({
      userId: input.userId,
      title: input.title,
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.priority !== undefined && { priority: input.priority }),
      projectId: input.projectId,
    });

    // リポジトリで永続化
    return await this.taskRepository.save(task);
  }
}
