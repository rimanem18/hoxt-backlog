import { and, eq } from 'drizzle-orm';
import type {
  ITaskRepository,
  UpdateTaskInput,
} from '@/domain/task/ITaskRepository';
import { TaskEntity } from '@/domain/task/TaskEntity';
import { TaskPriority } from '@/domain/task/valueobjects/TaskPriority';
import { TaskStatus } from '@/domain/task/valueobjects/TaskStatus';
import { TaskTitle } from '@/domain/task/valueobjects/TaskTitle';
import type { Database } from '../database/DatabaseConnection';
import { tasks } from '../database/schema';

/**
 * PostgreSQL実装のTaskRepository
 *
 * Drizzle ORMを使用してタスクの永続化を実現する。
 * ITaskRepositoryインターフェースの実装。
 */
export class PostgreSQLTaskRepository implements ITaskRepository {
  constructor(private readonly db: Database) {}

  async save(task: TaskEntity): Promise<TaskEntity> {
    const result = await this.db
      .insert(tasks)
      .values({
        id: task.getId(),
        userId: task.getUserId(),
        title: task.getTitle(),
        description: task.getDescription(),
        priority: task.getPriority(),
        status: task.getStatus(),
        createdAt: task.getCreatedAt(),
        updatedAt: task.getUpdatedAt(),
      })
      .returning();

    if (!result[0]) {
      throw new Error('Failed to save task');
    }

    return this.toDomain(result[0]);
  }

  async findById(userId: string, taskId: string): Promise<TaskEntity | null> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async update(
    userId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskEntity | null> {
    const result = await this.db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async delete(userId: string, taskId: string): Promise<boolean> {
    const { count = 0 } = await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .execute();

    return count > 0;
  }

  /**
   * データベース行からTaskEntityドメインオブジェクトに変換する
   *
   * @param row - データベースから取得した行データ
   * @returns TaskEntityインスタンス
   */
  private toDomain(row: typeof tasks.$inferSelect): TaskEntity {
    return TaskEntity.reconstruct({
      id: row.id,
      userId: row.userId,
      title: TaskTitle.create(row.title),
      description: row.description,
      priority: TaskPriority.create(row.priority),
      status: TaskStatus.create(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // 以下、ITaskRepositoryインターフェースの他のメソッドは未実装
  // TASK-1319で実装予定
  async findByUserId(): Promise<TaskEntity[]> {
    throw new Error('Not implemented yet');
  }

  async updateStatus(): Promise<TaskEntity | null> {
    throw new Error('Not implemented yet');
  }
}
