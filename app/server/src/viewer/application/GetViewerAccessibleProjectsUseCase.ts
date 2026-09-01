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
   * projectのオーナーuserIdをユニーク化し、並列取得した表示名で
   * userId→表示名のMapを作る。ユーザーが見つからない場合はnullを入れる。
   *
   * TODO: viewer1人あたりの招待project数が増える場合、オーナー数分の
   * findById呼び出し（N+1）がボトルネックになりうる。その際は
   * IUserRepositoryへの一括取得メソッド追加を検討する。
   */
  private async resolveOwnerNames(
    projects: ProjectEntity[],
  ): Promise<Map<string, string | null>> {
    const ownerUserIds = [...new Set(projects.map((p) => p.getUserId()))];
    const ownerNameEntries = await Promise.all(
      ownerUserIds.map(async (userId) => {
        const owner = await this.userRepository.findById(userId);
        return [userId, owner?.name ?? null] as const;
      }),
    );
    return new Map(ownerNameEntries);
  }
}
