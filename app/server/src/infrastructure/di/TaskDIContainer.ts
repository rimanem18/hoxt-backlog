import { ChangeTaskStatusUseCase } from '@/application/usecases/ChangeTaskStatusUseCase';
import { CreateTaskUseCase } from '@/application/usecases/CreateTaskUseCase';
import { DeleteTaskUseCase } from '@/application/usecases/DeleteTaskUseCase';
import { GetTaskByIdUseCase } from '@/application/usecases/GetTaskByIdUseCase';
import { GetTasksUseCase } from '@/application/usecases/GetTasksUseCase';
import { UpdateTaskUseCase } from '@/application/usecases/UpdateTaskUseCase';
import type { ITaskRepository } from '@/domain/task/ITaskRepository';
import { db } from '@/infrastructure/database/DatabaseConnection';
import { PostgreSQLTaskRepository } from '@/infrastructure/repositories/task/PostgreSQLTaskRepository';

/**
 * タスク管理の依存性注入を管理するDIコンテナ
 *
 * シングルトンパターンでタスク関連のUseCaseとRepositoryを管理。
 * リクエストごとのインスタンス生成を回避し、メモリ使用量を削減。
 */
export class TaskDIContainer {
  private static createTaskUseCaseInstance: CreateTaskUseCase | null = null;
  private static getTasksUseCaseInstance: GetTasksUseCase | null = null;
  private static getTaskByIdUseCaseInstance: GetTaskByIdUseCase | null = null;
  private static updateTaskUseCaseInstance: UpdateTaskUseCase | null = null;
  private static deleteTaskUseCaseInstance: DeleteTaskUseCase | null = null;
  private static changeTaskStatusUseCaseInstance: ChangeTaskStatusUseCase | null =
    null;
  private static taskRepositoryInstance: PostgreSQLTaskRepository | null = null;

  /**
   * CreateTaskUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getCreateTaskUseCase(): CreateTaskUseCase {
    if (!TaskDIContainer.createTaskUseCaseInstance) {
      const taskRepository = TaskDIContainer.getTaskRepository();
      TaskDIContainer.createTaskUseCaseInstance = new CreateTaskUseCase(
        taskRepository,
      );
    }
    return TaskDIContainer.createTaskUseCaseInstance;
  }

  /**
   * GetTasksUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getGetTasksUseCase(): GetTasksUseCase {
    if (!TaskDIContainer.getTasksUseCaseInstance) {
      const taskRepository = TaskDIContainer.getTaskRepository();
      TaskDIContainer.getTasksUseCaseInstance = new GetTasksUseCase(
        taskRepository,
      );
    }
    return TaskDIContainer.getTasksUseCaseInstance;
  }

  /**
   * GetTaskByIdUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getGetTaskByIdUseCase(): GetTaskByIdUseCase {
    if (!TaskDIContainer.getTaskByIdUseCaseInstance) {
      const taskRepository = TaskDIContainer.getTaskRepository();
      TaskDIContainer.getTaskByIdUseCaseInstance = new GetTaskByIdUseCase(
        taskRepository,
      );
    }
    return TaskDIContainer.getTaskByIdUseCaseInstance;
  }

  /**
   * UpdateTaskUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getUpdateTaskUseCase(): UpdateTaskUseCase {
    if (!TaskDIContainer.updateTaskUseCaseInstance) {
      const taskRepository = TaskDIContainer.getTaskRepository();
      TaskDIContainer.updateTaskUseCaseInstance = new UpdateTaskUseCase(
        taskRepository,
      );
    }
    return TaskDIContainer.updateTaskUseCaseInstance;
  }

  /**
   * DeleteTaskUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getDeleteTaskUseCase(): DeleteTaskUseCase {
    if (!TaskDIContainer.deleteTaskUseCaseInstance) {
      const taskRepository = TaskDIContainer.getTaskRepository();
      TaskDIContainer.deleteTaskUseCaseInstance = new DeleteTaskUseCase(
        taskRepository,
      );
    }
    return TaskDIContainer.deleteTaskUseCaseInstance;
  }

  /**
   * ChangeTaskStatusUseCaseのインスタンスを返す
   *
   * シングルトンパターンで効率的にインスタンスを管理
   */
  static getChangeTaskStatusUseCase(): ChangeTaskStatusUseCase {
    if (!TaskDIContainer.changeTaskStatusUseCaseInstance) {
      const taskRepository = TaskDIContainer.getTaskRepository();
      TaskDIContainer.changeTaskStatusUseCaseInstance =
        new ChangeTaskStatusUseCase(taskRepository);
    }
    return TaskDIContainer.changeTaskStatusUseCaseInstance;
  }

  /**
   * PostgreSQLTaskRepositoryの共有インスタンスを返す
   *
   * データベース接続プールを効率的に活用
   */
  private static getTaskRepository(): ITaskRepository {
    if (!TaskDIContainer.taskRepositoryInstance) {
      TaskDIContainer.taskRepositoryInstance = new PostgreSQLTaskRepository(db);
    }
    return TaskDIContainer.taskRepositoryInstance;
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

    TaskDIContainer.createTaskUseCaseInstance = null;
    TaskDIContainer.getTasksUseCaseInstance = null;
    TaskDIContainer.getTaskByIdUseCaseInstance = null;
    TaskDIContainer.updateTaskUseCaseInstance = null;
    TaskDIContainer.deleteTaskUseCaseInstance = null;
    TaskDIContainer.changeTaskStatusUseCaseInstance = null;
    TaskDIContainer.taskRepositoryInstance = null;
  }
}
