import { beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import { db } from '@/shared/database/DatabaseConnection';
import { projects, users } from '@/shared/database/schema';
import { PostgreSQLProjectRepository } from '../PostgreSQLProjectRepository';

describe('PostgreSQLProjectRepository', () => {
  let repository: PostgreSQLProjectRepository;
  const testUserId1 = '323e4567-e89b-12d3-a456-426614174002';
  const testUserId2 = '423e4567-e89b-12d3-a456-426614174003';

  beforeEach(async () => {
    repository = new PostgreSQLProjectRepository(db);

    // テストデータをクリーンアップ
    await db
      .delete(projects)
      .where(sql`${projects.userId} IN (${testUserId1}, ${testUserId2})`);
    await db
      .delete(users)
      .where(sql`${users.id} IN (${testUserId1}, ${testUserId2})`);

    // テストユーザーを作成
    await db.insert(users).values([
      {
        id: testUserId1,
        externalId: 'test-external-id-project-1',
        provider: 'google',
        email: 'project-test1@example.com',
        name: 'Project Test User 1',
      },
      {
        id: testUserId2,
        externalId: 'test-external-id-project-2',
        provider: 'google',
        email: 'project-test2@example.com',
        name: 'Project Test User 2',
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

  describe('findById', () => {
    test('プロジェクトIDとユーザーIDでプロジェクトを取得できる', async () => {
      // Given: 保存済みのプロジェクト
      const projectEntity = ProjectEntity.create({
        userId: testUserId1,
        name: '取得テストプロジェクト',
      });
      await repository.save(projectEntity);

      // When: プロジェクトIDとユーザーIDで取得
      const foundProject = await repository.findById(
        testUserId1,
        projectEntity.getId(),
      );

      // Then: プロジェクトが取得できる
      expect(foundProject).not.toBeNull();
      expect(foundProject?.getId()).toBe(projectEntity.getId());
      expect(foundProject?.getName()).toBe('取得テストプロジェクト');
    });

    test('存在しないプロジェクトIDの場合nullを返す', async () => {
      // Given: 存在しないプロジェクトID
      const nonExistentProjectId = '999e4567-e89b-12d3-a456-426614174999';

      // When: 存在しないプロジェクトIDで取得
      const foundProject = await repository.findById(
        testUserId1,
        nonExistentProjectId,
      );

      // Then: nullが返される
      expect(foundProject).toBeNull();
    });

    test('他のユーザーのプロジェクトは取得できない', async () => {
      // Given: ユーザー1のプロジェクト
      const projectEntity = ProjectEntity.create({
        userId: testUserId1,
        name: 'ユーザー1のプロジェクト',
      });
      await repository.save(projectEntity);

      // When: ユーザー2として同じプロジェクトIDで取得を試みる
      const foundProject = await repository.findById(
        testUserId2,
        projectEntity.getId(),
      );

      // Then: nullが返される（userIdフィルタで保護）
      expect(foundProject).toBeNull();
    });
  });

  describe('findByUserId', () => {
    test('指定ユーザーのプロジェクトのみを返す', async () => {
      // Given: ユーザー1とユーザー2のプロジェクト
      await repository.save(
        ProjectEntity.create({ userId: testUserId1, name: 'ユーザー1P1' }),
      );
      await repository.save(
        ProjectEntity.create({ userId: testUserId1, name: 'ユーザー1P2' }),
      );
      await repository.save(
        ProjectEntity.create({ userId: testUserId2, name: 'ユーザー2P1' }),
      );

      // When: ユーザー1のプロジェクト一覧を取得
      const result = await repository.findByUserId(testUserId1);

      // Then: ユーザー1のプロジェクトのみ（2件）返却される
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.getUserId() === testUserId1)).toBe(true);
    });

    test('プロジェクトが存在しない場合は空配列を返す', async () => {
      // When: プロジェクトを持たないユーザーの一覧を取得
      const result = await repository.findByUserId(testUserId1);

      // Then: 空配列が返される
      expect(result).toHaveLength(0);
    });

    test('作成日時の新しい順にソートされる', async () => {
      // Given: 作成日時が異なる複数のプロジェクト
      const project1 = ProjectEntity.create({
        userId: testUserId1,
        name: '古いプロジェクト',
      });
      await repository.save(project1);
      await db
        .update(projects)
        .set({ createdAt: new Date('2025-01-01T00:00:00.000Z') })
        .where(sql`${projects.id} = ${project1.getId()}`);

      const project2 = ProjectEntity.create({
        userId: testUserId1,
        name: '新しいプロジェクト',
      });
      await repository.save(project2);
      await db
        .update(projects)
        .set({ createdAt: new Date('2025-06-01T00:00:00.000Z') })
        .where(sql`${projects.id} = ${project2.getId()}`);

      // When: プロジェクト一覧を取得
      const result = await repository.findByUserId(testUserId1);

      // Then: 作成日時の新しい順に並ぶ
      expect(result).toHaveLength(2);
      expect(result[0]?.getName()).toBe('新しいプロジェクト');
      expect(result[1]?.getName()).toBe('古いプロジェクト');
    });
  });

  describe('update', () => {
    test('所有者本人のプロジェクトが更新されDBに反映される', async () => {
      // Given: 保存済みのプロジェクトを名前・説明文とも変更
      const projectEntity = ProjectEntity.create({
        userId: testUserId1,
        name: '更新前の名前',
        description: '更新前の説明',
      });
      await repository.save(projectEntity);
      projectEntity.updateName('更新後の名前');
      projectEntity.updateDescription('更新後の説明');

      // When: プロジェクトを更新
      const updatedProject = await repository.update(
        testUserId1,
        projectEntity.getId(),
        projectEntity,
      );

      // Then: 更新後の値が返り、DBにも反映される
      expect(updatedProject).not.toBeNull();
      expect(updatedProject?.getName()).toBe('更新後の名前');
      expect(updatedProject?.getDescription()).toBe('更新後の説明');

      const rows = await db
        .select()
        .from(projects)
        .where(sql`${projects.id} = ${projectEntity.getId()}`);
      expect(rows[0]?.name).toBe('更新後の名前');
      expect(rows[0]?.description).toBe('更新後の説明');
    });

    test('他のユーザーのプロジェクトを更新しようとするとnullを返す', async () => {
      // Given: ユーザー1のプロジェクト
      const projectEntity = ProjectEntity.create({
        userId: testUserId1,
        name: 'ユーザー1のプロジェクト',
      });
      await repository.save(projectEntity);
      projectEntity.updateName('不正な更新');

      // When: ユーザー2として更新を試みる
      const updatedProject = await repository.update(
        testUserId2,
        projectEntity.getId(),
        projectEntity,
      );

      // Then: nullが返され、DBの値は変更されない
      expect(updatedProject).toBeNull();

      const rows = await db
        .select()
        .from(projects)
        .where(sql`${projects.id} = ${projectEntity.getId()}`);
      expect(rows[0]?.name).toBe('ユーザー1のプロジェクト');
    });

    test('存在しないプロジェクトIDを指定するとnullを返す', async () => {
      // Given: 存在しないプロジェクトID
      const nonExistentProjectId = '999e4567-e89b-12d3-a456-426614174999';
      const projectEntity = ProjectEntity.create({
        userId: testUserId1,
        name: '存在しないプロジェクト',
      });

      // When: 存在しないプロジェクトIDで更新を試みる
      const updatedProject = await repository.update(
        testUserId1,
        nonExistentProjectId,
        projectEntity,
      );

      // Then: nullが返される
      expect(updatedProject).toBeNull();
    });
  });
});
