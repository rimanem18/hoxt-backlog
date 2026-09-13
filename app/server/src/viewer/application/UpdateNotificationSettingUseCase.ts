import { ViewerNotFoundError } from '@/viewer/domain/errors';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import type {
  IUpdateNotificationSettingUseCase,
  UpdateNotificationSettingInput,
} from './IUpdateNotificationSettingUseCase';

/**
 * 通知設定変更ユースケース
 *
 * 対象プロジェクトのactive招待を特定した上で、通知ON/OFFを更新する。
 */
export class UpdateNotificationSettingUseCase
  implements IUpdateNotificationSettingUseCase
{
  constructor(
    private readonly projectViewerRepository: IProjectViewerRepository,
  ) {}

  public async execute(
    input: UpdateNotificationSettingInput,
  ): Promise<ProjectViewerEntity> {
    const viewer =
      await this.projectViewerRepository.findActiveByProjectAndEmail(
        input.projectId,
        input.viewerEmail,
      );
    if (!viewer) {
      throw ViewerNotFoundError.forViewerId(input.viewerEmail);
    }

    const updated =
      await this.projectViewerRepository.updateNotificationEnabled(
        viewer.getId(),
        input.enabled,
      );
    if (!updated) {
      throw ViewerNotFoundError.forViewerId(viewer.getId());
    }
    return updated;
  }
}
