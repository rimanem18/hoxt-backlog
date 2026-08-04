import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import type {
  IUpdateProjectUseCase,
  UpdateProjectInput,
} from './IUpdateProjectUseCase';

/**
 * プロジェクト更新ユースケース
 *
 * 指定されたプロジェクトの名前・説明を部分更新する。
 * プロジェクトが存在しない場合はProjectNotFoundErrorをスローする。
 */
export class UpdateProjectUseCase implements IUpdateProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  /**
   * プロジェクトを更新する
   *
   * @param input - 更新条件（userId, projectId, name, description）
   * @returns 更新されたProjectEntity
   * @throws {ProjectNotFoundError} プロジェクトが見つからない場合
   * @throws {InvalidProjectDataError} 名前が不正な場合
   */
  async execute(input: UpdateProjectInput): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(
      input.userId,
      input.projectId,
    );

    if (!project) {
      throw ProjectNotFoundError.forProjectId(input.projectId);
    }

    if (input.name !== undefined) {
      project.updateName(input.name);
    }

    if (input.description !== undefined) {
      project.updateDescription(input.description);
    }

    const updatedProject = await this.projectRepository.update(
      input.userId,
      input.projectId,
      project,
    );

    // 万一の競合状態（更新直前に削除された等）に対するfail-closedのフォールバック
    if (!updatedProject) {
      throw ProjectNotFoundError.forProjectId(input.projectId);
    }

    return updatedProject;
  }
}
