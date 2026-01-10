import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type {
  ITaskRepository,
  TaskFilters,
  TaskSortBy,
  UpdateTaskInput,
} from '@/domain/task/ITaskRepository';
import { TaskEntity } from '@/domain/task/TaskEntity';
import { TaskPriority } from '@/domain/task/valueobjects/TaskPriority';
import { TaskStatus } from '@/domain/task/valueobjects/TaskStatus';
import { TaskTitle } from '@/domain/task/valueobjects/TaskTitle';
import type { Database } from '../../database/DatabaseConnection';
import { tasks } from '../../database/schema';

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

  async findByUserId(
    userId: string,
    filters: TaskFilters,
    sort: TaskSortBy,
  ): Promise<TaskEntity[]> {
    const conditions = [eq(tasks.userId, userId)];

    // 優先度フィルタ適用
    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    // ステータスフィルタ適用（複数選択、空配列の場合は無視）
    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(tasks.status, filters.status));
    }

    // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORMのクエリビルダーの複雑な型を扱うため
    let query: any = this.db
      .select()
      .from(tasks)
      .where(and(...conditions));

    // ソート適用
    switch (sort) {
      case 'created_at_desc':
        query = query.orderBy(desc(tasks.createdAt));
        break;
      case 'created_at_asc':
        query = query.orderBy(asc(tasks.createdAt));
        break;
      case 'priority_desc':
        query = query.orderBy(
          sql`CASE ${tasks.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`,
          desc(tasks.createdAt),
        );
        break;
    }

    const results = await query;
    return results.map((row: typeof tasks.$inferSelect) => this.toDomain(row));
  }

  async updateStatus(
    userId: string,
    taskId: string,
    status: string,
  ): Promise<TaskEntity | null> {
    const result = await this.db
      .update(tasks)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    return result[0] ? this.toDomain(result[0]) : null;
  }
}
