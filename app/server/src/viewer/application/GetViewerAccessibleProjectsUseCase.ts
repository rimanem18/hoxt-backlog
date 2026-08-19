import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
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
      tasks: tasksByProjectId.get(project.getId()) ?? [],
    }));
  }
}
