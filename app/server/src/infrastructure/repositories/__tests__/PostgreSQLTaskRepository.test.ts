import { beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { TaskEntity } from '@/domain/task/TaskEntity';
import { db } from '@/infrastructure/database/DatabaseConnection';
import { tasks, users } from '@/infrastructure/database/schema';
import { PostgreSQLTaskRepository } from '../PostgreSQLTaskRepository';

describe('PostgreSQLTaskRepository', () => {
  let repository: PostgreSQLTaskRepository;
  const testUserId1 = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId2 = '223e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    repository = new PostgreSQLTaskRepository(db);

    // テストデータをクリーンアップ
    await db
      .delete(tasks)
      .where(sql`${tasks.userId} IN (${testUserId1}, ${testUserId2})`);
    await db
      .delete(users)
      .where(sql`${users.id} IN (${testUserId1}, ${testUserId2})`);

    // テストユーザーを作成
    await db.insert(users).values([
      {
        id: testUserId1,
        externalId: 'test-external-id-1',
        provider: 'google',
        email: 'test1@example.com',
        name: 'Test User 1',
      },
      {
        id: testUserId2,
        externalId: 'test-external-id-2',
        provider: 'google',
        email: 'test2@example.com',
        name: 'Test User 2',
      },
    ]);
  });

  describe('save', () => {
    test('タスクを作成できる', async () => {
      // Given: 新しいタスクエンティティ
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: '新しいタスク',
        description: 'タスクの説明',
        priority: 'high',
      });

      // When: タスクを保存
      const savedTask = await repository.save(taskEntity);

      // Then: 保存されたタスクが返される
      expect(savedTask).toBeDefined();
      expect(savedTask.getId()).toBe(taskEntity.getId());
      expect(savedTask.getUserId()).toBe(testUserId1);
      expect(savedTask.getTitle()).toBe('新しいタスク');
      expect(savedTask.getDescription()).toBe('タスクの説明');
      expect(savedTask.getPriority()).toBe('high');
      expect(savedTask.getStatus()).toBe('not_started');
    });
  });

  describe('findById', () => {
    test('タスクIDでタスクを取得できる', async () => {
      // Given: 保存済みのタスク
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: '取得テスト',
        priority: 'medium',
      });
      await repository.save(taskEntity);

      // When: タスクIDで取得
      const foundTask = await repository.findById(
        testUserId1,
        taskEntity.getId(),
      );

      // Then: タスクが取得できる
      expect(foundTask).not.toBeNull();
      expect(foundTask?.getId()).toBe(taskEntity.getId());
      expect(foundTask?.getTitle()).toBe('取得テスト');
    });

    test('存在しないタスクIDの場合nullを返す', async () => {
      // Given: 存在しないタスクID
      const nonExistentTaskId = '999e4567-e89b-12d3-a456-426614174999';

      // When: 存在しないタスクIDで取得
      const foundTask = await repository.findById(
        testUserId1,
        nonExistentTaskId,
      );

      // Then: nullが返される
      expect(foundTask).toBeNull();
    });

    test('他のユーザーのタスクは取得できない（RLS検証）', async () => {
      // Given: ユーザー1のタスク
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: 'ユーザー1のタスク',
        priority: 'low',
      });
      await repository.save(taskEntity);

      // When: ユーザー2として同じタスクIDで取得を試みる
      const foundTask = await repository.findById(
        testUserId2,
        taskEntity.getId(),
      );

      // Then: nullが返される（RLSなしの場合でもuserIdフィルタで保護）
      expect(foundTask).toBeNull();
    });
  });

  describe('update', () => {
    test('タスクを更新できる', async () => {
      // Given: 保存済みのタスク
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: '更新前タイトル',
        description: '更新前説明',
        priority: 'low',
      });
      await repository.save(taskEntity);

      // When: タスクを更新
      const updatedTask = await repository.update(
        testUserId1,
        taskEntity.getId(),
        {
          title: '更新後タイトル',
          description: '更新後説明',
          priority: 'high',
        },
      );

      // Then: 更新されたタスクが返される
      expect(updatedTask).not.toBeNull();
      expect(updatedTask?.getTitle()).toBe('更新後タイトル');
      expect(updatedTask?.getDescription()).toBe('更新後説明');
      expect(updatedTask?.getPriority()).toBe('high');
    });

    test('存在しないタスクIDの場合nullを返す', async () => {
      // Given: 存在しないタスクID
      const nonExistentTaskId = '888e4567-e89b-12d3-a456-426614174888';

      // When: 存在しないタスクを更新
      const updatedTask = await repository.update(
        testUserId1,
        nonExistentTaskId,
        {
          title: '更新タイトル',
        },
      );

      // Then: nullが返される
      expect(updatedTask).toBeNull();
    });
  });

  describe('delete', () => {
    test('タスクを削除できる', async () => {
      // Given: 保存済みのタスク
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: '削除対象タスク',
        priority: 'medium',
      });
      await repository.save(taskEntity);

      // When: タスクを削除
      const isDeleted = await repository.delete(
        testUserId1,
        taskEntity.getId(),
      );

      // Then: trueが返される
      expect(isDeleted).toBe(true);

      // 削除後は取得できない
      const foundTask = await repository.findById(
        testUserId1,
        taskEntity.getId(),
      );
      expect(foundTask).toBeNull();
    });

    test('存在しないタスクIDの場合falseを返す', async () => {
      // Given: 存在しないタスクID
      const nonExistentTaskId = '777e4567-e89b-12d3-a456-426614174777';

      // When: 存在しないタスクを削除
      const isDeleted = await repository.delete(testUserId1, nonExistentTaskId);

      // Then: falseが返される
      expect(isDeleted).toBe(false);
    });
  });
});
