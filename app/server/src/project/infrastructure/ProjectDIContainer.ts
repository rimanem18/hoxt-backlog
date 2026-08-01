import { CreateProjectUseCase } from '@/project/application/CreateProjectUseCase';
import { GetProjectByIdUseCase } from '@/project/application/GetProjectByIdUseCase';
import { GetProjectsUseCase } from '@/project/application/GetProjectsUseCase';
import { UpdateProjectUseCase } from '@/project/application/UpdateProjectUseCase';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { db } from '@/shared/database/DatabaseConnection';
import { PostgreSQLProjectRepository } from './PostgreSQLProjectRepository';

/**
 * プロジェクト管理の依存性注入を管理するDIコンテナ
 *
 * シングルトンパターンでプロジェクト関連のUseCaseとRepositoryを管理。
 * リクエストごとのインスタンス生成を回避し、メモリ使用量を削減。
 */
export class ProjectDIContainer {
  private static createProjectUseCaseInstance: CreateProjectUseCase | null =
    null;
  private static getProjectsUseCaseInstance: GetProjectsUseCase | null = null;
  private static getProjectByIdUseCaseInstance: GetProjectByIdUseCase | null =
    null;
  private static projectRepositoryInstance: PostgreSQLProjectRepository | null =
    null;
  private static updateProjectUseCaseInstance: UpdateProjectUseCase | null =
    null;

  /**
   * CreateProjectUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getCreateProjectUseCase(): CreateProjectUseCase {
    if (!ProjectDIContainer.createProjectUseCaseInstance) {
      const projectRepository = ProjectDIContainer.getProjectRepository();
      ProjectDIContainer.createProjectUseCaseInstance =
        new CreateProjectUseCase(projectRepository);
    }
    return ProjectDIContainer.createProjectUseCaseInstance;
  }

  /**
   * GetProjectsUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getGetProjectsUseCase(): GetProjectsUseCase {
    if (!ProjectDIContainer.getProjectsUseCaseInstance) {
      const projectRepository = ProjectDIContainer.getProjectRepository();
      ProjectDIContainer.getProjectsUseCaseInstance = new GetProjectsUseCase(
        projectRepository,
      );
    }
    return ProjectDIContainer.getProjectsUseCaseInstance;
  }

  /**
   * GetProjectByIdUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getGetProjectByIdUseCase(): GetProjectByIdUseCase {
    if (!ProjectDIContainer.getProjectByIdUseCaseInstance) {
      const projectRepository = ProjectDIContainer.getProjectRepository();
      ProjectDIContainer.getProjectByIdUseCaseInstance =
        new GetProjectByIdUseCase(projectRepository);
    }
    return ProjectDIContainer.getProjectByIdUseCaseInstance;
  }

  /**
   * UpdateProjectUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getUpdateProjectUseCase(): UpdateProjectUseCase {
    if (!ProjectDIContainer.updateProjectUseCaseInstance) {
      const projectRepository = ProjectDIContainer.getProjectRepository();
      ProjectDIContainer.updateProjectUseCaseInstance =
        new UpdateProjectUseCase(projectRepository);
    }
    return ProjectDIContainer.updateProjectUseCaseInstance;
  }

  /**
   * PostgreSQLProjectRepositoryの共有インスタンスを返す
   *
   * データベース接続プールを効率的に活用
   */
  private static getProjectRepository(): IProjectRepository {
    if (!ProjectDIContainer.projectRepositoryInstance) {
      ProjectDIContainer.projectRepositoryInstance =
        new PostgreSQLProjectRepository(db);
    }
    return ProjectDIContainer.projectRepositoryInstance;
  }

  /**
   * テスト用のインスタンスリセット機能
   *
   * テスト環境専用。テスト間のインスタンス汚染を防ぐ
   */
  public static resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTesting is only available in test environment');
    }

    ProjectDIContainer.createProjectUseCaseInstance = null;
    ProjectDIContainer.getProjectsUseCaseInstance = null;
    ProjectDIContainer.getProjectByIdUseCaseInstance = null;
    ProjectDIContainer.updateProjectUseCaseInstance = null;
    ProjectDIContainer.projectRepositoryInstance = null;
  }
}
