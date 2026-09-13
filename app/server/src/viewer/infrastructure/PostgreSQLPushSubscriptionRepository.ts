import { and, eq, sql } from 'drizzle-orm';
import type { DatabaseOrTransaction } from '@/shared/database/DatabaseConnection';
import { viewerPushSubscriptions } from '@/shared/database/schema';
import type { IPushSubscriptionRepository } from '@/viewer/domain/IPushSubscriptionRepository';
import { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';

/**
 * PostgreSQL実装のPushSubscriptionRepository
 *
 * Drizzle ORMを使用してviewerのWeb Push購読を永続化する。
 * IPushSubscriptionRepositoryインターフェースの実装。
 * Unit of Work経由のトランザクションスコープでも利用できるよう、
 * 通常のDBインスタンスとトランザクションの両方を受け付ける。
 */
export class PostgreSQLPushSubscriptionRepository
  implements IPushSubscriptionRepository
{
  constructor(private readonly db: DatabaseOrTransaction) {}

  async save(entity: PushSubscriptionEntity): Promise<PushSubscriptionEntity> {
    // Why: 一意制約が式インデックス(lower(email), endpoint)のため、Drizzleの
    // onConflictDoUpdate（プレーンな列のみをtargetに取れる）は使えない。
    // 「update後0件ならinsert」という2クエリ構成は並行登録時に一意制約違反を
    // 起こすため、生SQLでON CONFLICTによる単一クエリの原子的upsertにする。
    const idCol = sql.raw(viewerPushSubscriptions.id.name);
    const emailCol = sql.raw(viewerPushSubscriptions.email.name);
    const endpointCol = sql.raw(viewerPushSubscriptions.endpoint.name);
    const p256dhCol = sql.raw(viewerPushSubscriptions.p256dhKey.name);
    const authCol = sql.raw(viewerPushSubscriptions.authKey.name);
    const createdAtCol = sql.raw(viewerPushSubscriptions.createdAt.name);
    const updatedAtCol = sql.raw(viewerPushSubscriptions.updatedAt.name);

    const rows = await this.db.execute<
      typeof viewerPushSubscriptions.$inferSelect
    >(sql`
      insert into ${viewerPushSubscriptions} (
        ${idCol}, ${emailCol}, ${endpointCol}, ${p256dhCol}, ${authCol}, ${createdAtCol}, ${updatedAtCol}
      )
      values (
        ${entity.getId()},
        ${entity.getEmail()},
        ${entity.getEndpoint()},
        ${entity.getP256dhKey()},
        ${entity.getAuthKey()},
        ${entity.getCreatedAt().toISOString()},
        ${entity.getUpdatedAt().toISOString()}
      )
      on conflict (lower(${emailCol}), ${endpointCol})
      do update set
        ${p256dhCol} = excluded.${p256dhCol},
        ${authCol} = excluded.${authCol},
        ${updatedAtCol} = excluded.${updatedAtCol}
      returning
        ${idCol} as id,
        ${emailCol} as email,
        ${endpointCol} as endpoint,
        ${p256dhCol} as "p256dhKey",
        ${authCol} as "authKey",
        ${createdAtCol} as "createdAt",
        ${updatedAtCol} as "updatedAt"
    `);

    const row = rows[0];
    if (!row) {
      throw new Error('Failed to save push subscription');
    }

    return this.toDomain(row);
  }

  async findByEmail(email: string): Promise<PushSubscriptionEntity[]> {
    const result = await this.db
      .select()
      .from(viewerPushSubscriptions)
      .where(sql`lower(${viewerPushSubscriptions.email}) = lower(${email})`);

    return result.map((row) => this.toDomain(row));
  }

  async deleteByEndpoint(email: string, endpoint: string): Promise<void> {
    await this.db
      .delete(viewerPushSubscriptions)
      .where(
        and(
          sql`lower(${viewerPushSubscriptions.email}) = lower(${email})`,
          eq(viewerPushSubscriptions.endpoint, endpoint),
        ),
      );
  }

  /**
   * データベース行からPushSubscriptionEntityドメインオブジェクトに変換する
   *
   * @param row - データベースから取得した行データ
   * @returns PushSubscriptionEntityインスタンス
   */
  private toDomain(
    row: typeof viewerPushSubscriptions.$inferSelect,
  ): PushSubscriptionEntity {
    return PushSubscriptionEntity.reconstruct({
      id: row.id,
      email: row.email,
      endpoint: row.endpoint,
      p256dhKey: row.p256dhKey,
      authKey: row.authKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
