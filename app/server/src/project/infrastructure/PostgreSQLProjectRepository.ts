import { and, desc, eq } from 'drizzle-orm';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import { ProjectName } from '@/project/domain/valueobjects/ProjectName';
import type { Database } from '@/shared/database/DatabaseConnection';
import { projects } from '@/shared/database/schema';

/**
 * PostgreSQL実装のProjectRepository
 *
 * Drizzle ORMを使用してプロジェクトの永続化を実現する。
 * IProjectRepositoryインターフェースの実装。
 */
export class PostgreSQLProjectRepository implements IProjectRepository {
  constructor(private readonly db: Database) {}

  async save(project: ProjectEntity): Promise<ProjectEntity> {
    const result = await this.db
      .insert(projects)
      .values({
        id: project.getId(),
        userId: project.getUserId(),
        name: project.getName(),
        description: project.getDescription(),
        createdAt: project.getCreatedAt(),
        updatedAt: project.getUpdatedAt(),
      })
      .returning();

    if (!result[0]) {
      throw new Error('Failed to save project');
    }

    return this.toDomain(result[0]);
  }

  async findById(
    userId: string,
    projectId: string,
  ): Promise<ProjectEntity | null> {
    const result = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async update(
    userId: string,
    projectId: string,
    project: ProjectEntity,
  ): Promise<ProjectEntity | null> {
    const result = await this.db
      .update(projects)
      .set({
        name: project.getName(),
        description: project.getDescription(),
        updatedAt: project.getUpdatedAt(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning();

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByUserId(userId: string): Promise<ProjectEntity[]> {
    const results = await this.db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));

    return results.map((row) => this.toDomain(row));
  }

  /**
   * データベース行からProjectEntityドメインオブジェクトに変換する
   *
   * @param row - データベースから取得した行データ
   * @returns ProjectEntityインスタンス
   */
  private toDomain(row: typeof projects.$inferSelect): ProjectEntity {
    return ProjectEntity.reconstruct({
      id: row.id,
      userId: row.userId,
      name: ProjectName.create(row.name),
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
