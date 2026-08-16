import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@/shared/database/DatabaseConnection';
import { projectViewers } from '@/shared/database/schema';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';

/**
 * PostgreSQL実装のProjectViewerRepository
 *
 * Drizzle ORMを使用してプロジェクト閲覧者招待の永続化を実現する。
 * IProjectViewerRepositoryインターフェースの実装。
 */
export class PostgreSQLProjectViewerRepository
  implements IProjectViewerRepository
{
  constructor(private readonly db: Database) {}

  async save(entity: ProjectViewerEntity): Promise<ProjectViewerEntity> {
    const updateResult = await this.db
      .update(projectViewers)
      .set({
        status: entity.getStatus(),
        revokedAt: entity.getRevokedAt(),
        updatedAt: entity.getUpdatedAt(),
      })
      .where(eq(projectViewers.id, entity.getId()))
      .returning();

    if (updateResult[0]) {
      return this.toDomain(updateResult[0]);
    }

    const insertResult = await this.db
      .insert(projectViewers)
      .values({
        id: entity.getId(),
        projectId: entity.getProjectId(),
        email: entity.getEmail(),
        status: entity.getStatus(),
        invitedAt: entity.getInvitedAt(),
        revokedAt: entity.getRevokedAt(),
        createdAt: entity.getCreatedAt(),
        updatedAt: entity.getUpdatedAt(),
      })
      .returning();

    if (!insertResult[0]) {
      throw new Error('Failed to save project viewer');
    }

    return this.toDomain(insertResult[0]);
  }

  async findByProjectAndEmail(
    projectId: string,
    email: string,
  ): Promise<ProjectViewerEntity | null> {
    const result = await this.db
      .select()
      .from(projectViewers)
      .where(
        and(
          eq(projectViewers.projectId, projectId),
          sql`lower(${projectViewers.email}) = lower(${email})`,
        ),
      )
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(projectViewers).where(eq(projectViewers.id, id));
  }

  /**
   * データベース行からProjectViewerEntityドメインオブジェクトに変換する
   *
   * @param row - データベースから取得した行データ
   * @returns ProjectViewerEntityインスタンス
   */
  private toDomain(
    row: typeof projectViewers.$inferSelect,
  ): ProjectViewerEntity {
    return ProjectViewerEntity.reconstruct({
      id: row.id,
      projectId: row.projectId,
      email: row.email,
      status: row.status,
      invitedAt: row.invitedAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
