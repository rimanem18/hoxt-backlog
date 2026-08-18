import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import type {
  IListProjectViewersUseCase,
  ListProjectViewersInput,
} from './IListProjectViewersUseCase';

/**
 * プロジェクト閲覧者一覧取得ユースケース
 *
 * プロジェクト所有権を検証した上で、active状態の招待一覧を返す。
 */
export class ListProjectViewersUseCase implements IListProjectViewersUseCase {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly projectViewerRepository: IProjectViewerRepository,
  ) {}

  public async execute(
    input: ListProjectViewersInput,
  ): Promise<ProjectViewerEntity[]> {
    const project = await this.projectRepository.findById(
      input.userId,
      input.projectId,
    );
    if (!project) {
      throw ProjectNotFoundError.forProjectId(input.projectId);
    }

    return this.projectViewerRepository.findActiveByProject(input.projectId);
  }
}
