import { beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '@/shared/database/DatabaseConnection';
import { projects, projectViewers, users } from '@/shared/database/schema';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { PostgreSQLProjectViewerRepository } from '../PostgreSQLProjectViewerRepository';

describe('PostgreSQLProjectViewerRepository', () => {
  let repository: PostgreSQLProjectViewerRepository;
  const testUserId = '523e4567-e89b-12d3-a456-426614174010';
  const testProjectId = '623e4567-e89b-12d3-a456-426614174011';
  const testProjectId2 = '723e4567-e89b-12d3-a456-426614174012';

  beforeEach(async () => {
    repository = new PostgreSQLProjectViewerRepository(db);

    await db
      .delete(projectViewers)
      .where(
        sql`${projectViewers.projectId} IN (${testProjectId}, ${testProjectId2})`,
      );
    await db
      .delete(projects)
      .where(sql`${projects.id} IN (${testProjectId}, ${testProjectId2})`);
    await db.delete(users).where(sql`${users.id} = ${testUserId}`);

    await db.insert(users).values({
      id: testUserId,
      externalId: 'test-external-id-viewer-repo',
      provider: 'google',
      email: 'viewer-repo-owner@example.com',
      name: 'Viewer Repo Owner',
    });
    await db.insert(projects).values([
      { id: testProjectId, userId: testUserId, name: '招待テストプロジェクト' },
      {
        id: testProjectId2,
        userId: testUserId,
        name: '招待テストプロジェクト2',
      },
    ]);
  });

  describe('save', () => {
    test('新規招待を保存できる', async () => {
      // Given: 新規招待のエンティティ
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'viewer@example.com',
      });

      // When: 招待を保存
      const saved = await repository.save(entity);

      // Then: 保存された招待が返される
      expect(saved.getId()).toBe(entity.getId());
      expect(saved.getProjectId()).toBe(testProjectId);
      expect(saved.getEmail()).toBe('viewer@example.com');
      expect(saved.getStatus()).toBe('active');
    });

    test('既存招待（同一ID）を保存すると更新される', async () => {
      // Given: 保存済みの招待を取り消した状態
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'viewer-update@example.com',
      });
      await repository.save(entity);
      entity.revoke();

      // When: 取り消し後の状態を保存
      const saved = await repository.save(entity);

      // Then: 同一行が更新され、ステータスがrevokedになる
      expect(saved.getId()).toBe(entity.getId());
      expect(saved.getStatus()).toBe('revoked');
      expect(saved.getRevokedAt()).not.toBeNull();

      const rows = await db
        .select()
        .from(projectViewers)
        .where(sql`${projectViewers.id} = ${entity.getId()}`);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe('revoked');
    });
  });

  describe('findByProjectAndEmail', () => {
    test('projectIdとemailで招待を取得できる', async () => {
      // Given: 保存済みの招待
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'find-target@example.com',
      });
      await repository.save(entity);

      // When: projectIdとemailで検索
      const found = await repository.findByProjectAndEmail(
        testProjectId,
        'find-target@example.com',
      );

      // Then: 招待が取得できる
      expect(found).not.toBeNull();
      expect(found?.getId()).toBe(entity.getId());
    });

    test('取り消し済み（revoked）の招待も取得できる', async () => {
      // Given: 取り消し済みの招待
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'revoked-target@example.com',
      });
      entity.revoke();
      await repository.save(entity);

      // When: projectIdとemailで検索
      const found = await repository.findByProjectAndEmail(
        testProjectId,
        'revoked-target@example.com',
      );

      // Then: revoked状態の招待が取得できる
      expect(found).not.toBeNull();
      expect(found?.getStatus()).toBe('revoked');
    });

    test('該当する招待が存在しない場合nullを返す', async () => {
      // When: 存在しない組み合わせで検索
      const found = await repository.findByProjectAndEmail(
        testProjectId,
        'not-found@example.com',
      );

      // Then: nullが返される
      expect(found).toBeNull();
    });

    test('別プロジェクトの同一emailは取得できない', async () => {
      // Given: プロジェクト1への招待のみ保存
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'project-scoped@example.com',
      });
      await repository.save(entity);

      // When: プロジェクト2で同一emailを検索
      const found = await repository.findByProjectAndEmail(
        testProjectId2,
        'project-scoped@example.com',
      );

      // Then: nullが返される
      expect(found).toBeNull();
    });
  });

  describe('deleteById', () => {
    test('招待を削除できる', async () => {
      // Given: 保存済みの招待
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'delete-target@example.com',
      });
      await repository.save(entity);

      // When: 招待を削除
      await repository.deleteById(entity.getId());

      // Then: 検索してもnullが返る
      const found = await repository.findByProjectAndEmail(
        testProjectId,
        'delete-target@example.com',
      );
      expect(found).toBeNull();
    });

    test('存在しないIDを削除してもエラーにならない', async () => {
      // When & Then: 存在しないIDの削除がエラーなく完了する
      await expect(
        repository.deleteById('999e4567-e89b-12d3-a456-426614174999'),
      ).resolves.toBeUndefined();
    });
  });

  describe('revoke', () => {
    test('招待をrevoked状態に更新できる', async () => {
      // Given: active状態の招待
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'revoke-target@example.com',
      });
      await repository.save(entity);

      // When: revokeを実行
      await repository.revoke(entity.getId());

      // Then: statusがrevokedになりrevokedAtが設定される
      const found = await repository.findByProjectAndEmail(
        testProjectId,
        'revoke-target@example.com',
      );
      expect(found?.getStatus()).toBe('revoked');
      expect(found?.getRevokedAt()).not.toBeNull();
    });
  });

  describe('restore', () => {
    test('取り消し済みの招待をactive状態に復元できる', async () => {
      // Given: revoked状態の招待
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'restore-target@example.com',
      });
      await repository.save(entity);
      await repository.revoke(entity.getId());

      // When: restoreを実行
      await repository.restore(entity.getId());

      // Then: statusがactiveになりrevokedAtがクリアされる
      const found = await repository.findByProjectAndEmail(
        testProjectId,
        'restore-target@example.com',
      );
      expect(found?.getStatus()).toBe('active');
      expect(found?.getRevokedAt()).toBeNull();
    });

    test('active→revoke→restore→revokeと操作すると各段階で状態が正しい', async () => {
      // Given: active状態の招待
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'cycle-target@example.com',
      });
      await repository.save(entity);

      // When & Then: revoke→restore→revokeの各段階で状態が正しい
      await repository.revoke(entity.getId());
      let found = await repository.findByProjectAndEmail(
        testProjectId,
        'cycle-target@example.com',
      );
      expect(found?.getStatus()).toBe('revoked');
      expect(found?.getRevokedAt()).not.toBeNull();

      await repository.restore(entity.getId());
      found = await repository.findByProjectAndEmail(
        testProjectId,
        'cycle-target@example.com',
      );
      expect(found?.getStatus()).toBe('active');
      expect(found?.getRevokedAt()).toBeNull();

      await repository.revoke(entity.getId());
      found = await repository.findByProjectAndEmail(
        testProjectId,
        'cycle-target@example.com',
      );
      expect(found?.getStatus()).toBe('revoked');
      expect(found?.getRevokedAt()).not.toBeNull();
    });
  });

  describe('findActiveByProject', () => {
    test('activeな招待のみをemail昇順で取得できる', async () => {
      // Given: active2件・revoked1件の招待（emailは非昇順で保存）
      const viewerB = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'b-viewer@example.com',
      });
      const viewerA = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'a-viewer@example.com',
      });
      const revoked = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'c-revoked@example.com',
      });
      revoked.revoke();
      await repository.save(viewerB);
      await repository.save(viewerA);
      await repository.save(revoked);

      // When: プロジェクトのactive招待一覧を取得
      const result = await repository.findActiveByProject(testProjectId);

      // Then: revoked分を除外し、email昇順で返す
      expect(result.map((v) => v.getEmail())).toEqual([
        'a-viewer@example.com',
        'b-viewer@example.com',
      ]);
    });

    test('該当する招待が0件の場合は空配列を返す（境界値）', async () => {
      // When: 招待が1件もないプロジェクトで取得
      const result = await repository.findActiveByProject(testProjectId);

      // Then: 空配列が返る
      expect(result).toEqual([]);
    });

    test('別プロジェクトの招待は含まれない', async () => {
      // Given: 別プロジェクトへの招待
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId2,
        email: 'other-project@example.com',
      });
      await repository.save(entity);

      // When: testProjectIdで取得
      const result = await repository.findActiveByProject(testProjectId);

      // Then: 別プロジェクトの招待は含まれない
      expect(result).toEqual([]);
    });
  });

  describe('findActiveByEmail', () => {
    test('activeな招待のprojectId一覧を取得できる', async () => {
      // Given: 同一emailで複数projectへのactive招待
      await repository.save(
        ProjectViewerEntity.create({
          projectId: testProjectId,
          email: 'multi-project@example.com',
        }),
      );
      await repository.save(
        ProjectViewerEntity.create({
          projectId: testProjectId2,
          email: 'multi-project@example.com',
        }),
      );

      // When: emailでactive招待のprojectId一覧を取得
      const result = await repository.findActiveByEmail(
        'multi-project@example.com',
      );

      // Then: 両方のprojectIdが取得できる
      expect(result.sort()).toEqual([testProjectId, testProjectId2].sort());
    });

    test('revoked状態の招待は含まれない', async () => {
      // Given: active1件・revoked1件の招待
      await repository.save(
        ProjectViewerEntity.create({
          projectId: testProjectId,
          email: 'mixed-status@example.com',
        }),
      );
      const revoked = ProjectViewerEntity.create({
        projectId: testProjectId2,
        email: 'mixed-status@example.com',
      });
      revoked.revoke();
      await repository.save(revoked);

      // When: emailでactive招待のprojectId一覧を取得
      const result = await repository.findActiveByEmail(
        'mixed-status@example.com',
      );

      // Then: activeなprojectIdのみ返る
      expect(result).toEqual([testProjectId]);
    });

    test('招待が0件のemailでは空配列を返す（境界値）', async () => {
      // When: 招待のないemailで取得
      const result = await repository.findActiveByEmail(
        'no-invitation@example.com',
      );

      // Then: 空配列が返る
      expect(result).toEqual([]);
    });

    test('全ての招待が取り消し済みの場合は空配列を返す（境界値）', async () => {
      // Given: 全てrevoked状態の招待
      const revoked = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'all-revoked@example.com',
      });
      revoked.revoke();
      await repository.save(revoked);

      // When: emailでactive招待のprojectId一覧を取得
      const result = await repository.findActiveByEmail(
        'all-revoked@example.com',
      );

      // Then: 空配列が返る
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    test('IDで招待を取得できる', async () => {
      // Given: 保存済みの招待
      const entity = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'findbyid-target@example.com',
      });
      await repository.save(entity);

      // When: IDで検索
      const found = await repository.findById(entity.getId());

      // Then: 招待が取得できる
      expect(found).not.toBeNull();
      expect(found?.getId()).toBe(entity.getId());
    });

    test('存在しないIDの場合nullを返す', async () => {
      // When: 存在しないIDで検索
      const found = await repository.findById(
        '999e4567-e89b-12d3-a456-426614174999',
      );

      // Then: nullが返る
      expect(found).toBeNull();
    });
  });
});
