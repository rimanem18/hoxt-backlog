import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { TaskChangeEvent } from '@/task/application/ports/ITaskChangeNotifier';
import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
import type { TaskPriorityValue } from '@/task/domain/valueobjects/TaskPriority';
import { TaskChangeNotifierRegistry } from '@/task/infrastructure/TaskChangeNotifierRegistry';
import type { IUpdateTaskUseCase, UpdateTaskInput } from './IUpdateTaskUseCase';

/**
 * タスク更新ユースケース
 *
 * 指定されたタスクのタイトル・説明・優先度・所属projectを更新する。
 * projectIdが指定された場合はIProjectRepositoryで所有権を検証する。
 * タスクが存在しない場合はTaskNotFoundErrorをスローする。
 */
export class UpdateTaskUseCase implements IUpdateTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
  ) {}

  /**
   * タスクを更新する
   *
   * @param input - 更新条件（userId, taskId, data）
   * @returns 更新されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   * @throws {ProjectNotFoundError} 指定projectIdの所有権が確認できない場合
   */
  async execute(input: UpdateTaskInput): Promise<TaskEntity> {
    const task = await this.taskRepository.findById(input.userId, input.taskId);

    if (!task) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    if (input.data.projectId !== undefined) {
      const project = await this.projectRepository.findById(
        input.userId,
        input.data.projectId,
      );

      if (!project) {
        throw ProjectNotFoundError.forProjectId(input.data.projectId);
      }
    }

    const previousPriority = task.getPriority();
    const previousProjectId = task.getProjectId();

    if (input.data.title !== undefined) {
      task.updateTitle(input.data.title);
    }

    if (input.data.description !== undefined) {
      task.updateDescription(input.data.description);
    }

    if (input.data.priority !== undefined) {
      task.changePriority(input.data.priority);
    }

    if (input.data.projectId !== undefined) {
      task.updateProjectId(input.data.projectId);
    }

    const updatedTask = await this.taskRepository.update(
      input.userId,
      input.taskId,
      task,
    );

    // 万一の競合状態（更新直前に削除された等）に対するfail-closedのフォールバック
    if (!updatedTask) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    // RISK-02: 通知失敗はタスク更新自体に影響させない（fail-open）
    // REQ-305: project付け替えのみ（priority変更を伴わない）ではイベントを発行しない
    const priorityChanged =
      input.data.priority !== undefined &&
      input.data.priority !== previousPriority;

    if (priorityChanged) {
      const notifyProjectId =
        input.data.projectId !== undefined
          ? input.data.projectId
          : previousProjectId;

      if (notifyProjectId !== null) {
        const event: TaskChangeEvent = {
          type: 'priority_changed',
          taskId: updatedTask.getId(),
          taskTitle: updatedTask.getTitle(),
          projectId: notifyProjectId,
          // changePriority()はTaskPriority値オブジェクトが生成時に検証済みの値を返す
          newPriority: updatedTask.getPriority() as TaskPriorityValue,
        };
        try {
          await TaskChangeNotifierRegistry.getNotifier().notify(event);
        } catch (error) {
          console.error('task変更通知の送信に失敗しました', error);
        }
      }
    }

    return updatedTask;
  }
}
