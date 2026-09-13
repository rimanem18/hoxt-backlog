import { and, asc, eq, sql } from 'drizzle-orm';
import type { DatabaseOrTransaction } from '@/shared/database/DatabaseConnection';
import { projectViewers } from '@/shared/database/schema';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';

/**
 * PostgreSQL実装のProjectViewerRepository
 *
 * Drizzle ORMを使用してプロジェクト閲覧者招待の永続化を実現する。
 * IProjectViewerRepositoryインターフェースの実装。
 * Unit of Work経由のトランザクションスコープでも利用できるよう、
 * 通常のDBインスタンスとトランザクションの両方を受け付ける。
 */
export class PostgreSQLProjectViewerRepository
  implements IProjectViewerRepository
{
  constructor(private readonly db: DatabaseOrTransaction) {}

  async save(entity: ProjectViewerEntity): Promise<ProjectViewerEntity> {
    const updateResult = await this.db
      .update(projectViewers)
      .set({
        status: entity.getStatus(),
        revokedAt: entity.getRevokedAt(),
        updatedAt: entity.getUpdatedAt(),
        notificationEnabled: entity.isNotificationEnabled(),
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
        notificationEnabled: entity.isNotificationEnabled(),
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
    return this.findOneByProjectAndEmail(projectId, email);
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(projectViewers).where(eq(projectViewers.id, id));
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(projectViewers)
      .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(projectViewers.id, id));
  }

  async restore(id: string): Promise<void> {
    await this.db
      .update(projectViewers)
      .set({
        status: 'active',
        revokedAt: null,
        updatedAt: new Date(),
        notificationEnabled: true,
      })
      .where(eq(projectViewers.id, id));
  }

  async findActiveByProject(projectId: string): Promise<ProjectViewerEntity[]> {
    const result = await this.db
      .select()
      .from(projectViewers)
      .where(
        and(
          eq(projectViewers.projectId, projectId),
          eq(projectViewers.status, 'active'),
        ),
      )
      .orderBy(asc(projectViewers.email));

    return result.map((row) => this.toDomain(row));
  }

  async findActiveByEmail(email: string): Promise<ProjectViewerEntity[]> {
    const result = await this.db
      .select()
      .from(projectViewers)
      .where(
        and(
          sql`lower(${projectViewers.email}) = lower(${email})`,
          eq(projectViewers.status, 'active'),
        ),
      );

    return result.map((row) => this.toDomain(row));
  }

  async updateNotificationEnabled(
    id: string,
    enabled: boolean,
  ): Promise<ProjectViewerEntity | null> {
    const result = await this.db
      .update(projectViewers)
      .set({ notificationEnabled: enabled, updatedAt: new Date() })
      .where(eq(projectViewers.id, id))
      .returning();

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findActiveByProjectAndEmail(
    projectId: string,
    email: string,
  ): Promise<ProjectViewerEntity | null> {
    return this.findOneByProjectAndEmail(projectId, email, {
      activeOnly: true,
    });
  }

  async findById(id: string): Promise<ProjectViewerEntity | null> {
    const result = await this.db
      .select()
      .from(projectViewers)
      .where(eq(projectViewers.id, id))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  /**
   * projectIdとemail（大文字小文字区別なし）で招待を1件検索する
   *
   * @param options.activeOnly - trueの場合、status='active'の招待のみに絞り込む
   */
  private async findOneByProjectAndEmail(
    projectId: string,
    email: string,
    options?: { activeOnly?: boolean },
  ): Promise<ProjectViewerEntity | null> {
    const conditions = [
      eq(projectViewers.projectId, projectId),
      sql`lower(${projectViewers.email}) = lower(${email})`,
    ];
    if (options?.activeOnly) {
      conditions.push(eq(projectViewers.status, 'active'));
    }

    const result = await this.db
      .select()
      .from(projectViewers)
      .where(and(...conditions))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
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
      notificationEnabled: row.notificationEnabled,
    });
  }
}
