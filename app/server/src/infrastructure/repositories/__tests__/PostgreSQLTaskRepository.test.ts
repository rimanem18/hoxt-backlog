import { beforeEach, describe, expect, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { TaskEntity } from '@/domain/task/TaskEntity';
import { db } from '@/infrastructure/database/DatabaseConnection';
import { tasks, users } from '@/infrastructure/database/schema';
import { PostgreSQLTaskRepository } from '../task/PostgreSQLTaskRepository';

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

  describe('findByUserId', () => {
    beforeEach(async () => {
      // テスト用タスクを作成（異なる優先度・ステータス・作成日時）
      const now = new Date();
      const tasksToCreate = [
        TaskEntity.create({
          userId: testUserId1,
          title: 'タスク1（高優先度・未着手）',
          priority: 'high',
        }),
        TaskEntity.create({
          userId: testUserId1,
          title: 'タスク2（中優先度・進行中）',
          priority: 'medium',
        }),
        TaskEntity.create({
          userId: testUserId1,
          title: 'タスク3（低優先度・完了）',
          priority: 'low',
        }),
        TaskEntity.create({
          userId: testUserId2,
          title: 'ユーザー2のタスク',
          priority: 'high',
        }),
      ];

      // タスクを時間差で保存（createdAtの差を確実にする）
      for (let i = 0; i < tasksToCreate.length; i++) {
        const task = tasksToCreate[i];
        if (!task) continue;

        await repository.save(task);

        // createdAtを明示的に更新（古い順: タスク1 → タスク2 → タスク3）
        await db
          .update(tasks)
          .set({
            createdAt: new Date(now.getTime() + i * 1000), // 1秒ずつずらす
            updatedAt: new Date(now.getTime() + i * 1000),
          })
          .where(eq(tasks.id, task.getId()));
      }

      // ステータスを手動で更新（タスク2: 進行中、タスク3: 完了）
      await db
        .update(tasks)
        .set({ status: 'in_progress' })
        .where(sql`${tasks.title} = 'タスク2（中優先度・進行中）'`);

      await db
        .update(tasks)
        .set({ status: 'completed' })
        .where(sql`${tasks.title} = 'タスク3（低優先度・完了）'`);
    });

    describe('優先度フィルタ', () => {
      test('優先度"high"でフィルタできる', async () => {
        // When: 優先度"high"でフィルタ
        const result = await repository.findByUserId(
          testUserId1,
          { priority: 'high' },
          'created_at_desc',
        );

        // Then: 優先度"high"のタスクのみ返却される
        expect(result).toHaveLength(1);
        expect(result[0]?.getTitle()).toBe('タスク1（高優先度・未着手）');
        expect(result[0]?.getPriority()).toBe('high');
      });

      test('優先度"medium"でフィルタできる', async () => {
        // When: 優先度"medium"でフィルタ
        const result = await repository.findByUserId(
          testUserId1,
          { priority: 'medium' },
          'created_at_desc',
        );

        // Then: 優先度"medium"のタスクのみ返却される
        expect(result).toHaveLength(1);
        expect(result[0]?.getTitle()).toBe('タスク2（中優先度・進行中）');
        expect(result[0]?.getPriority()).toBe('medium');
      });
    });

    describe('ステータスフィルタ', () => {
      test('ステータス["not_started"]でフィルタできる', async () => {
        // When: ステータス"not_started"でフィルタ
        const result = await repository.findByUserId(
          testUserId1,
          { status: ['not_started'] },
          'created_at_desc',
        );

        // Then: ステータス"not_started"のタスクのみ返却される
        expect(result).toHaveLength(1);
        expect(result[0]?.getStatus()).toBe('not_started');
      });

      test('複数ステータス["not_started", "in_progress"]でフィルタできる', async () => {
        // When: 複数ステータスでフィルタ
        const result = await repository.findByUserId(
          testUserId1,
          { status: ['not_started', 'in_progress'] },
          'created_at_desc',
        );

        // Then: 該当するステータスのタスクのみ返却される
        expect(result).toHaveLength(2);
        const statuses = result.map((t) => t.getStatus());
        expect(statuses).toContain('not_started');
        expect(statuses).toContain('in_progress');
      });

      test('ステータス空配列[]の場合、全タスクが返却される', async () => {
        // When: ステータス空配列でフィルタ
        const result = await repository.findByUserId(
          testUserId1,
          { status: [] },
          'created_at_desc',
        );

        // Then: 全タスク（ユーザー1の3件）が返却される
        expect(result).toHaveLength(3);
      });
    });

    describe('複合フィルタ', () => {
      test('優先度"high"かつステータス["not_started"]でフィルタできる', async () => {
        // When: 優先度とステータスの複合フィルタ
        const result = await repository.findByUserId(
          testUserId1,
          { priority: 'high', status: ['not_started'] },
          'created_at_desc',
        );

        // Then: 両条件に合致するタスクのみ返却される
        expect(result).toHaveLength(1);
        expect(result[0]?.getPriority()).toBe('high');
        expect(result[0]?.getStatus()).toBe('not_started');
      });

      test('優先度"high"かつ複数ステータス["in_progress", "completed"]でフィルタできる', async () => {
        // When: 優先度と複数ステータスの複合フィルタ
        const result = await repository.findByUserId(
          testUserId1,
          { priority: 'high', status: ['in_progress', 'completed'] },
          'created_at_desc',
        );

        // Then: 条件に合致しないため0件
        expect(result).toHaveLength(0);
      });
    });

    describe('ソート', () => {
      test('created_at_desc（作成日時の新しい順）でソートできる', async () => {
        // When: 作成日時の新しい順でソート
        const result = await repository.findByUserId(
          testUserId1,
          {},
          'created_at_desc',
        );

        // Then: 新しい順に並ぶ
        expect(result).toHaveLength(3);
        expect(result[0]?.getTitle()).toBe('タスク3（低優先度・完了）');
        expect(result[1]?.getTitle()).toBe('タスク2（中優先度・進行中）');
        expect(result[2]?.getTitle()).toBe('タスク1（高優先度・未着手）');
      });

      test('created_at_asc（作成日時の古い順）でソートできる', async () => {
        // When: 作成日時の古い順でソート
        const result = await repository.findByUserId(
          testUserId1,
          {},
          'created_at_asc',
        );

        // Then: 古い順に並ぶ
        expect(result).toHaveLength(3);
        expect(result[0]?.getTitle()).toBe('タスク1（高優先度・未着手）');
        expect(result[1]?.getTitle()).toBe('タスク2（中優先度・進行中）');
        expect(result[2]?.getTitle()).toBe('タスク3（低優先度・完了）');
      });

      test('priority_desc（優先度順：高→中→低）でソートできる', async () => {
        // When: 優先度順でソート
        const result = await repository.findByUserId(
          testUserId1,
          {},
          'priority_desc',
        );

        // Then: 優先度順（high → medium → low）に並ぶ
        expect(result).toHaveLength(3);
        expect(result[0]?.getPriority()).toBe('high');
        expect(result[1]?.getPriority()).toBe('medium');
        expect(result[2]?.getPriority()).toBe('low');
      });
    });

    describe('フィルタなし', () => {
      test('フィルタ条件が空の場合、全タスクが返却される', async () => {
        // When: フィルタなしで取得
        const result = await repository.findByUserId(
          testUserId1,
          {},
          'created_at_desc',
        );

        // Then: ユーザー1の全タスク（3件）が返却される
        expect(result).toHaveLength(3);
      });
    });

    describe('RLS（Row-Level Security）', () => {
      test('他ユーザーのタスクは返却されない', async () => {
        // When: ユーザー1のタスクを取得
        const result = await repository.findByUserId(
          testUserId1,
          {},
          'created_at_desc',
        );

        // Then: ユーザー1のタスクのみ（3件）
        expect(result).toHaveLength(3);
        expect(result.every((t) => t.getUserId() === testUserId1)).toBe(true);
      });
    });
  });

  describe('updateStatus', () => {
    test('タスクのステータスを更新できる', async () => {
      // Given: 保存済みのタスク（ステータス: not_started）
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: 'ステータス更新テスト',
        description: 'テスト説明',
        priority: 'medium',
      });
      await repository.save(taskEntity);

      // When: ステータスをin_progressに更新
      const updatedTask = await repository.updateStatus(
        testUserId1,
        taskEntity.getId(),
        'in_progress',
      );

      // Then: 更新されたタスクが返される
      expect(updatedTask).not.toBeNull();
      expect(updatedTask?.getId()).toBe(taskEntity.getId());
      expect(updatedTask?.getStatus()).toBe('in_progress');
      // タイトルや説明は変更されない
      expect(updatedTask?.getTitle()).toBe('ステータス更新テスト');
      expect(updatedTask?.getDescription()).toBe('テスト説明');
      expect(updatedTask?.getPriority()).toBe('medium');
    });

    test('updatedAtが更新される', async () => {
      // Given: 保存済みのタスク
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: 'updatedAtテスト',
        priority: 'low',
      });
      await repository.save(taskEntity);
      const originalUpdatedAt = taskEntity.getUpdatedAt();

      // 時間差を確実にするため少し待機
      await new Promise((resolve) => setTimeout(resolve, 10));

      // When: ステータスを更新
      const updatedTask = await repository.updateStatus(
        testUserId1,
        taskEntity.getId(),
        'completed',
      );

      // Then: updatedAtが更新される
      expect(updatedTask).not.toBeNull();
      expect(updatedTask?.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    test.each(['not_started', 'in_progress', 'in_review', 'completed'])(
      'ステータス "%s" に変更できる',
      async (status: string) => {
        // Given: 保存済みのタスク
        const taskEntity = TaskEntity.create({
          userId: testUserId1,
          title: `ステータス${status}テスト`,
          priority: 'high',
        });
        await repository.save(taskEntity);

        // When: 指定されたステータスに変更
        const updatedTask = await repository.updateStatus(
          testUserId1,
          taskEntity.getId(),
          status,
        );

        // Then: ステータスが正しく変更される
        expect(updatedTask).not.toBeNull();
        expect(updatedTask?.getStatus()).toBe(status);
      },
    );

    test('存在しないタスクIDの場合nullを返す', async () => {
      // Given: 存在しないタスクID
      const nonExistentTaskId = '666e4567-e89b-12d3-a456-426614174666';

      // When: 存在しないタスクのステータスを更新
      const updatedTask = await repository.updateStatus(
        testUserId1,
        nonExistentTaskId,
        'completed',
      );

      // Then: nullが返される
      expect(updatedTask).toBeNull();
    });

    test('他のユーザーのタスクは更新できない（RLS検証）', async () => {
      // Given: ユーザー1のタスク
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: 'ユーザー1のタスク',
        priority: 'high',
      });
      await repository.save(taskEntity);

      // When: ユーザー2として同じタスクIDのステータスを更新しようとする
      const updatedTask = await repository.updateStatus(
        testUserId2,
        taskEntity.getId(),
        'completed',
      );

      // Then: nullが返される（更新できない）
      expect(updatedTask).toBeNull();

      // 元のタスクのステータスは変更されていない
      const originalTask = await repository.findById(
        testUserId1,
        taskEntity.getId(),
      );
      expect(originalTask?.getStatus()).toBe('not_started');
    });

    test('連続してステータスを変更できる', async () => {
      // Given: 保存済みのタスク
      const taskEntity = TaskEntity.create({
        userId: testUserId1,
        title: '連続ステータス変更テスト',
        priority: 'medium',
      });
      await repository.save(taskEntity);

      // When: ステータスを段階的に変更
      const step1 = await repository.updateStatus(
        testUserId1,
        taskEntity.getId(),
        'in_progress',
      );
      expect(step1?.getStatus()).toBe('in_progress');

      const step2 = await repository.updateStatus(
        testUserId1,
        taskEntity.getId(),
        'in_review',
      );
      expect(step2?.getStatus()).toBe('in_review');

      const step3 = await repository.updateStatus(
        testUserId1,
        taskEntity.getId(),
        'completed',
      );

      // Then: 最終的にcompletedになる
      expect(step3?.getStatus()).toBe('completed');
    });
  });
});
