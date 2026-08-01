import { beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import { db } from '@/shared/database/DatabaseConnection';
import { projects, users } from '@/shared/database/schema';
import { PostgreSQLProjectRepository } from '../PostgreSQLProjectRepository';

describe('PostgreSQLProjectRepository', () => {
  let repository: PostgreSQLProjectRepository;
  const testUserId1 = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(async () => {
    repository = new PostgreSQLProjectRepository(db);

    // テストデータをクリーンアップ
    await db
      .delete(projects)
      .where(sql`${projects.userId} IN (${testUserId1})`);
    await db.delete(users).where(sql`${users.id} IN (${testUserId1})`);

    // テストユーザーを作成
    await db.insert(users).values([
      {
        id: testUserId1,
        externalId: 'test-external-id-project-1',
        provider: 'google',
        email: 'project-test1@example.com',
        name: 'Project Test User 1',
      },
    ]);
  });

  describe('save', () => {
    test('説明文ありのプロジェクトを作成できる', async () => {
      // Given: 説明文ありの新しいプロジェクトエンティティ
      const projectEntity = ProjectEntity.create({
        userId: testUserId1,
        name: '新しいプロジェクト',
        description: 'プロジェクトの説明',
      });

      // When: プロジェクトを保存
      const savedProject = await repository.save(projectEntity);

      // Then: 保存されたプロジェクトが返される
      expect(savedProject).toBeDefined();
      expect(savedProject.getId()).toBe(projectEntity.getId());
      expect(savedProject.getUserId()).toBe(testUserId1);
      expect(savedProject.getName()).toBe('新しいプロジェクト');
      expect(savedProject.getDescription()).toBe('プロジェクトの説明');
    });

    test('説明文なしのプロジェクトを作成できる', async () => {
      // Given: 説明文なしの新しいプロジェクトエンティティ
      const projectEntity = ProjectEntity.create({
        userId: testUserId1,
        name: '説明なしプロジェクト',
      });

      // When: プロジェクトを保存
      const savedProject = await repository.save(projectEntity);

      // Then: descriptionがnullで保存される
      expect(savedProject.getName()).toBe('説明なしプロジェクト');
      expect(savedProject.getDescription()).toBeNull();
    });

    test('DBに永続化された値がエンティティのプロパティと一致する', async () => {
      // Given: 新しいプロジェクトエンティティ
      const projectEntity = ProjectEntity.create({
        userId: testUserId1,
        name: '永続化確認プロジェクト',
        description: '永続化確認用の説明',
      });

      // When: プロジェクトを保存
      await repository.save(projectEntity);

      // Then: DBに直接問い合わせた値がエンティティと一致する
      const rows = await db
        .select()
        .from(projects)
        .where(sql`${projects.id} = ${projectEntity.getId()}`);

      expect(rows).toHaveLength(1);
      expect(rows[0]?.userId).toBe(testUserId1);
      expect(rows[0]?.name).toBe('永続化確認プロジェクト');
      expect(rows[0]?.description).toBe('永続化確認用の説明');
    });

    test('同名プロジェクトの重複保存が成功する', async () => {
      // Given: 同じ名前を持つ2つのプロジェクトエンティティ
      const projectEntity1 = ProjectEntity.create({
        userId: testUserId1,
        name: '重複プロジェクト',
      });
      const projectEntity2 = ProjectEntity.create({
        userId: testUserId1,
        name: '重複プロジェクト',
      });

      // When: 両方を保存
      const savedProject1 = await repository.save(projectEntity1);
      const savedProject2 = await repository.save(projectEntity2);

      // Then: どちらも正常に保存される（一意性制約なし）
      expect(savedProject1.getId()).not.toBe(savedProject2.getId());
      expect(savedProject1.getName()).toBe('重複プロジェクト');
      expect(savedProject2.getName()).toBe('重複プロジェクト');
    });
  });
});
