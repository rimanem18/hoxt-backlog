import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
import type { IUserRepository } from '@/user/domain/IUserRepository';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type {
  GetViewerAccessibleProjectsInput,
  IGetViewerAccessibleProjectsUseCase,
  ViewerAccessibleProjectDTO,
  ViewerAccessibleTaskDTO,
} from './IGetViewerAccessibleProjectsUseCase';

function toTaskDTO(task: TaskEntity): ViewerAccessibleTaskDTO {
  return {
    id: task.getId(),
    title: task.getTitle(),
    description: task.getDescription(),
    status: task.getStatus(),
    priority: task.getPriority(),
  };
}

/**
 * viewerがアクセス可能なプロジェクト取得ユースケース
 *
 * emailに紐づくactive招待のprojectId一覧を取得し、
 * 該当プロジェクトとタスクをprojectIdごとにグルーピングして返す。
 */
export class GetViewerAccessibleProjectsUseCase
  implements IGetViewerAccessibleProjectsUseCase
{
  constructor(
    private readonly projectViewerRepository: IProjectViewerRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  public async execute(
    input: GetViewerAccessibleProjectsInput,
  ): Promise<ViewerAccessibleProjectDTO[]> {
    const projectIds = await this.projectViewerRepository.findActiveByEmail(
      input.viewerEmail,
    );
    if (projectIds.length === 0) {
      return [];
    }

    const [projects, tasks] = await Promise.all([
      this.projectRepository.findByIds(projectIds),
      this.taskRepository.findByProjectIds(projectIds),
    ]);

    const ownerNameByUserId = await this.resolveOwnerNames(projects);

    const tasksByProjectId = new Map<string, ViewerAccessibleTaskDTO[]>();
    for (const task of tasks) {
      const taskDTO = toTaskDTO(task);
      const projectId = task.getProjectId();
      if (!projectId) {
        continue;
      }
      const existing = tasksByProjectId.get(projectId) ?? [];
      existing.push(taskDTO);
      tasksByProjectId.set(projectId, existing);
    }

    return projects.map((project) => ({
      projectId: project.getId(),
      projectName: project.getName(),
      ownerName: ownerNameByUserId.get(project.getUserId()) ?? null,
      tasks: tasksByProjectId.get(project.getId()) ?? [],
    }));
  }

  /**
   * projectのオーナーuserIdをユニーク化し、一括取得した表示名で
   * userId→表示名のMapを作る。呼び出し側で `?? null` により
   * 未取得（Mapに存在しない）オーナーはnull扱いになる。
   */
  private async resolveOwnerNames(
    projects: ProjectEntity[],
  ): Promise<Map<string, string>> {
    const ownerUserIds = [...new Set(projects.map((p) => p.getUserId()))];
    const owners = await this.userRepository.findByIds(ownerUserIds);
    return new Map(owners.map((owner) => [owner.id, owner.name]));
  }
}
