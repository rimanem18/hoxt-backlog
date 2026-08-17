import { beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '@/shared/database/DatabaseConnection';
import {
  projects,
  projectViewers,
  users,
  viewerAccessTokens,
} from '@/shared/database/schema';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import { PostgreSQLViewerInvitationUnitOfWork } from '../PostgreSQLViewerInvitationUnitOfWork';

describe('PostgreSQLViewerInvitationUnitOfWork', () => {
  let unitOfWork: PostgreSQLViewerInvitationUnitOfWork;
  const testUserId = '823e4567-e89b-12d3-a456-426614174020';
  const testProjectId = '923e4567-e89b-12d3-a456-426614174021';
  const commitEmail = 'uow-commit@example.com';
  const rollbackEmail = 'uow-rollback@example.com';

  beforeEach(async () => {
    unitOfWork = new PostgreSQLViewerInvitationUnitOfWork();

    await db
      .delete(viewerAccessTokens)
      .where(
        sql`lower(${viewerAccessTokens.email}) IN (${commitEmail}, ${rollbackEmail})`,
      );
    await db
      .delete(projectViewers)
      .where(sql`${projectViewers.projectId} = ${testProjectId}`);
    await db.delete(projects).where(sql`${projects.id} = ${testProjectId}`);
    await db.delete(users).where(sql`${users.id} = ${testUserId}`);

    await db.insert(users).values({
      id: testUserId,
      externalId: 'test-external-id-viewer-uow',
      provider: 'google',
      email: 'viewer-uow-owner@example.com',
      name: 'Viewer UoW Owner',
    });
    await db.insert(projects).values({
      id: testProjectId,
      userId: testUserId,
      name: 'UoWテストプロジェクト',
    });
  });

  test('コールバック内の複数Repository書き込みが単一トランザクションとしてコミットされる', async () => {
    // Given: 招待エンティティとトークンエンティティ
    const viewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: commitEmail,
    });
    const token = ViewerAccessTokenEntity.create({
      email: commitEmail,
      rawToken: 'raw-token-commit',
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    // When: 両方の保存を単一トランザクションとして実行
    const result = await unitOfWork.execute(async (repos) => {
      const savedViewer = await repos.projectViewerRepository.save(viewer);
      const savedToken = await repos.viewerAccessTokenRepository.save(token);
      return { savedViewer, savedToken };
    });

    // Then: 両方がコミットされDBに残る
    expect(result.savedViewer.getId()).toBe(viewer.getId());
    expect(result.savedToken.getEmail()).toBe(commitEmail);

    const viewerRows = await db
      .select()
      .from(projectViewers)
      .where(sql`${projectViewers.id} = ${viewer.getId()}`);
    expect(viewerRows).toHaveLength(1);

    const tokenRows = await db
      .select()
      .from(viewerAccessTokens)
      .where(sql`lower(${viewerAccessTokens.email}) = lower(${commitEmail})`);
    expect(tokenRows).toHaveLength(1);
  });

  test('コールバック内で例外が発生すると、それまでの書き込みがすべてロールバックされる', async () => {
    // Given: 招待保存後にトークン保存が例外を投げるコールバック
    const viewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: rollbackEmail,
    });
    const failure = new Error('トークン保存に失敗しました');

    // When & Then: 呼び出し元に例外がそのまま伝播する
    await expect(
      unitOfWork.execute(async (repos) => {
        await repos.projectViewerRepository.save(viewer);
        throw failure;
      }),
    ).rejects.toBe(failure);

    // Then: 先に保存したはずの招待もロールバックされDBに残らない
    const viewerRows = await db
      .select()
      .from(projectViewers)
      .where(sql`${projectViewers.id} = ${viewer.getId()}`);
    expect(viewerRows).toHaveLength(0);
  });
});
