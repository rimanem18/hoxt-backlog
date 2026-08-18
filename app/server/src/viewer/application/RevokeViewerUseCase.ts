import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ViewerNotFoundError } from '@/viewer/domain/errors';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type {
  IRevokeViewerUseCase,
  RevokeViewerInput,
} from './IRevokeViewerUseCase';

/**
 * viewer取り消しユースケース
 *
 * プロジェクト所有権を検証した上で、対象の招待を取り消す。
 * 対象が存在しない・別プロジェクトに属する・既にrevoked状態の場合は
 * ViewerNotFoundErrorとして扱う。
 */
export class RevokeViewerUseCase implements IRevokeViewerUseCase {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly projectViewerRepository: IProjectViewerRepository,
  ) {}

  public async execute(input: RevokeViewerInput): Promise<void> {
    const project = await this.projectRepository.findById(
      input.userId,
      input.projectId,
    );
    if (!project) {
      throw ProjectNotFoundError.forProjectId(input.projectId);
    }

    const viewer = await this.projectViewerRepository.findById(input.viewerId);
    if (
      viewer === null ||
      viewer.getProjectId() !== input.projectId ||
      viewer.getStatus() === 'revoked'
    ) {
      throw ViewerNotFoundError.forViewerId(input.viewerId);
    }

    viewer.revoke();
    await this.projectViewerRepository.save(viewer);
  }
}
