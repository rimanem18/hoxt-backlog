import { CreateProjectUseCase } from '@/project/application/CreateProjectUseCase';
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
  private static projectRepositoryInstance: PostgreSQLProjectRepository | null =
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
    ProjectDIContainer.projectRepositoryInstance = null;
  }
}
