import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ProjectEntity } from '@/project/domain/ProjectEntity';

/**
 * プロジェクト作成ユースケースの入力データ
 */
export interface CreateProjectInput {
  userId: string;
  name: string;
  description?: string;
}

/**
 * プロジェクト作成ユースケース
 *
 * ログイン済みユーザーが新規プロジェクトを作成する。
 * ProjectEntityのファクトリメソッドでバリデーションを行い、
 * IProjectRepositoryを通じて永続化する。
 */
export class CreateProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  /**
   * プロジェクトを作成する
   *
   * @param input - プロジェクト作成に必要な入力データ
   * @returns 作成されたProjectEntity
   * @throws {InvalidProjectDataError} 名前が不正な場合
   */
  async execute(input: CreateProjectInput): Promise<ProjectEntity> {
    // ProjectEntity.create()でバリデーションとエンティティ生成
    // undefinedのプロパティは渡さない（exactOptionalPropertyTypes対応）
    const project = ProjectEntity.create({
      userId: input.userId,
      name: input.name,
      ...(input.description !== undefined && {
        description: input.description,
      }),
    });

    // リポジトリで永続化
    return await this.projectRepository.save(project);
  }
}
