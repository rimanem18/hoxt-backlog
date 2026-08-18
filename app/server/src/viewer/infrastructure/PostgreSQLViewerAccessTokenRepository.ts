import { eq, sql } from 'drizzle-orm';
import type { DatabaseOrTransaction } from '@/shared/database/DatabaseConnection';
import { viewerAccessTokens } from '@/shared/database/schema';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';

/**
 * PostgreSQL実装のViewerAccessTokenRepository
 *
 * Drizzle ORMを使用して閲覧者アクセストークンの永続化を実現する。
 * IViewerAccessTokenRepositoryインターフェースの実装。
 * Unit of Work経由のトランザクションスコープでも利用できるよう、
 * 通常のDBインスタンスとトランザクションの両方を受け付ける。
 */
export class PostgreSQLViewerAccessTokenRepository
  implements IViewerAccessTokenRepository
{
  constructor(private readonly db: DatabaseOrTransaction) {}

  async save(
    entity: ViewerAccessTokenEntity,
  ): Promise<ViewerAccessTokenEntity> {
    const updateResult = await this.db
      .update(viewerAccessTokens)
      .set({
        tokenHash: entity.getTokenHash(),
        expiresAt: entity.getExpiresAt(),
        updatedAt: entity.getUpdatedAt(),
      })
      .where(
        sql`lower(${viewerAccessTokens.email}) = lower(${entity.getEmail()})`,
      )
      .returning();

    if (updateResult[0]) {
      return this.toDomain(updateResult[0]);
    }

    const insertResult = await this.db
      .insert(viewerAccessTokens)
      .values({
        id: entity.getId(),
        email: entity.getEmail(),
        tokenHash: entity.getTokenHash(),
        expiresAt: entity.getExpiresAt(),
        createdAt: entity.getCreatedAt(),
        updatedAt: entity.getUpdatedAt(),
      })
      .returning();

    if (!insertResult[0]) {
      throw new Error('Failed to save viewer access token');
    }

    return this.toDomain(insertResult[0]);
  }

  async findByEmail(email: string): Promise<ViewerAccessTokenEntity | null> {
    const result = await this.db
      .select()
      .from(viewerAccessTokens)
      .where(sql`lower(${viewerAccessTokens.email}) = lower(${email})`)
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.db
      .delete(viewerAccessTokens)
      .where(eq(viewerAccessTokens.id, id));
  }

  async replace(
    existingId: string,
    newTokenHash: string,
    newExpiresAt: Date,
  ): Promise<ViewerAccessTokenEntity> {
    const updateResult = await this.db
      .update(viewerAccessTokens)
      .set({
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(viewerAccessTokens.id, existingId))
      .returning();

    if (!updateResult[0]) {
      throw new Error('Failed to save viewer access token');
    }

    return this.toDomain(updateResult[0]);
  }

  /**
   * データベース行からViewerAccessTokenEntityドメインオブジェクトに変換する
   *
   * @param row - データベースから取得した行データ
   * @returns ViewerAccessTokenEntityインスタンス
   */
  private toDomain(
    row: typeof viewerAccessTokens.$inferSelect,
  ): ViewerAccessTokenEntity {
    return ViewerAccessTokenEntity.reconstruct({
      id: row.id,
      email: row.email,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
