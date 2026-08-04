import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import type {
  GetProjectByIdInput,
  IGetProjectByIdUseCase,
} from './IGetProjectByIdUseCase';

/**
 * プロジェクト詳細取得ユースケース
 *
 * 指定されたプロジェクトIDに基づいて単一のプロジェクト詳細情報を取得する。
 * プロジェクトが存在しない場合はProjectNotFoundErrorをスローする。
 */
export class GetProjectByIdUseCase implements IGetProjectByIdUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  /**
   * プロジェクト詳細を取得する
   *
   * @param input - 取得条件（userId, projectId）
   * @returns 取得されたProjectEntity
   * @throws {ProjectNotFoundError} プロジェクトが見つからない場合
   */
  async execute(input: GetProjectByIdInput): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(
      input.userId,
      input.projectId,
    );

    if (!project) {
      throw ProjectNotFoundError.forProjectId(input.projectId);
    }

    return project;
  }
}
