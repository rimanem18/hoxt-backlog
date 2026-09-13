import type { TaskChangeEvent } from '@/task/application/ports/ITaskChangeNotifier';
import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
import type { TaskStatusValue } from '@/task/domain/valueobjects/TaskStatus';
import { TaskChangeNotifierRegistry } from '@/task/infrastructure/TaskChangeNotifierRegistry';
import type {
  ChangeTaskStatusInput,
  IChangeTaskStatusUseCase,
} from './IChangeTaskStatusUseCase';

/**
 * タスクステータス変更ユースケース
 *
 * タスクのステータスを変更する。
 * タイトルや説明の更新とは独立して、ステータスのみを効率的に変更する。
 */
export class ChangeTaskStatusUseCase implements IChangeTaskStatusUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスクステータスを変更する
   *
   * @param input - 変更条件（userId, taskId, status）
   * @returns 更新されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  async execute(input: ChangeTaskStatusInput): Promise<TaskEntity> {
    const task = await this.taskRepository.updateStatus(
      input.userId,
      input.taskId,
      input.status,
    );

    if (!task) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    // RISK-02: 通知失敗はステータス変更自体に影響させない（fail-open）
    const projectId = task.getProjectId();
    if (projectId !== null) {
      const event: TaskChangeEvent = {
        type: 'status_changed',
        taskId: task.getId(),
        taskTitle: task.getTitle(),
        projectId,
        // getStatus()はTaskStatus値オブジェクトが生成時に検証済みの値を返す
        newStatus: task.getStatus() as TaskStatusValue,
      };
      try {
        await TaskChangeNotifierRegistry.getNotifier().notify(event);
      } catch (error) {
        console.error('task変更通知の送信に失敗しました', error);
      }
    }

    return task;
  }
}
