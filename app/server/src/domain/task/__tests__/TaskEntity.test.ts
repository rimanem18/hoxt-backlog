import { describe, expect, test } from 'bun:test';
import { TaskEntity } from '../TaskEntity';
import { TaskPriority } from '../valueobjects/TaskPriority';
import { TaskStatus } from '../valueobjects/TaskStatus';
import { TaskTitle } from '../valueobjects/TaskTitle';

describe('TaskEntity', () => {
  // ==========================================================================
  // ファクトリメソッド: create（新規作成）
  // ==========================================================================
  describe('create', () => {
    test('最小限のデータ（userId, title）で新規タスクが作成される', () => {
      // Given: 最小限のデータ
      const userId = 'user-uuid-123';
      const title = 'タスクのタイトル';

      // When: 新規タスクを作成
      const task = TaskEntity.create({ userId, title });

      // Then: タスクが正しく作成される
      expect(task.getUserId()).toBe(userId);
      expect(task.getTitle()).toBe(title);
    });

    test('すべてのデータで新規タスクが作成される', () => {
      // Given: すべてのデータ
      const userId = 'user-uuid-123';
      const title = 'タスクのタイトル';
      const description = 'タスクの説明（Markdown形式）';
      const priority = 'high';

      // When: 新規タスクを作成
      const task = TaskEntity.create({ userId, title, description, priority });

      // Then: すべてのデータが正しく設定される
      expect(task.getUserId()).toBe(userId);
      expect(task.getTitle()).toBe(title);
      expect(task.getDescription()).toBe(description);
      expect(task.getPriority()).toBe(priority);
    });

    test('デフォルト値が設定される（priority: medium, status: not_started, description: null）', () => {
      // Given: 最小限のデータ
      const userId = 'user-uuid-123';
      const title = 'タスクのタイトル';

      // When: 新規タスクを作成
      const task = TaskEntity.create({ userId, title });

      // Then: デフォルト値が設定される
      expect(task.getPriority()).toBe('medium');
      expect(task.getStatus()).toBe('not_started');
      expect(task.getDescription()).toBeNull();
    });

    test('IDとタイムスタンプが自動生成される', () => {
      // Given: 最小限のデータ
      const userId = 'user-uuid-123';
      const title = 'タスクのタイトル';

      // When: 新規タスクを作成
      const task = TaskEntity.create({ userId, title });

      // Then: IDとタイムスタンプが自動生成される
      expect(task.getId()).toBeDefined();
      expect(task.getId().length).toBeGreaterThan(0);
      expect(task.getCreatedAt()).toBeInstanceOf(Date);
      expect(task.getUpdatedAt()).toBeInstanceOf(Date);
    });

    test('空タイトルでエラーがスローされる', () => {
      // Given: 空タイトル
      const userId = 'user-uuid-123';
      const title = '';

      // When & Then: エラーがスローされる
      expect(() => TaskEntity.create({ userId, title })).toThrow(
        'タイトルを入力してください',
      );
    });

    test('101文字以上のタイトルでエラーがスローされる', () => {
      // Given: 101文字のタイトル
      const userId = 'user-uuid-123';
      const title = 'a'.repeat(101);

      // When & Then: エラーがスローされる
      expect(() => TaskEntity.create({ userId, title })).toThrow(
        'タイトルは100文字以内で入力してください',
      );
    });

    test('不正な優先度でエラーがスローされる', () => {
      // Given: 不正な優先度
      const userId = 'user-uuid-123';
      const title = '有効なタイトル';
      const priority = 'invalid';

      // When & Then: エラーがスローされる
      expect(() => TaskEntity.create({ userId, title, priority })).toThrow(
        '不正な優先度です',
      );
    });
  });

  // ==========================================================================
  // ファクトリメソッド: reconstruct（DB復元）
  // ==========================================================================
  describe('reconstruct', () => {
    test('復元したタスクのすべてのデータが保持される', () => {
      // Given: DBから取得したデータ
      const props = {
        id: 'task-uuid-456',
        userId: 'user-uuid-123',
        title: TaskTitle.create('DBから復元されたタスク'),
        description: 'マークダウン説明',
        priority: TaskPriority.create('low'),
        status: TaskStatus.create('in_progress'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-02T00:00:00Z'),
      };

      // When: DBから復元
      const task = TaskEntity.reconstruct(props);

      // Then: すべてのデータが保持される
      expect(task.getId()).toBe(props.id);
      expect(task.getUserId()).toBe(props.userId);
      expect(task.getTitle()).toBe('DBから復元されたタスク');
      expect(task.getDescription()).toBe(props.description);
      expect(task.getPriority()).toBe('low');
      expect(task.getStatus()).toBe('in_progress');
      expect(task.getCreatedAt()).toEqual(props.createdAt);
      expect(task.getUpdatedAt()).toEqual(props.updatedAt);
    });
  });

  // ==========================================================================
  // ゲッターメソッド
  // ==========================================================================
  describe('getters', () => {
    test('各ゲッターが正しい値を返す', () => {
      // Given: タスクを作成
      const task = TaskEntity.create({
        userId: 'user-uuid-123',
        title: 'テストタスク',
        description: '説明文',
        priority: 'high',
      });

      // Then: 各ゲッターが正しい値を返す
      expect(typeof task.getId()).toBe('string');
      expect(task.getUserId()).toBe('user-uuid-123');
      expect(task.getTitle()).toBe('テストタスク');
      expect(task.getDescription()).toBe('説明文');
      expect(task.getPriority()).toBe('high');
      expect(task.getStatus()).toBe('not_started');
      expect(task.getCreatedAt()).toBeInstanceOf(Date);
      expect(task.getUpdatedAt()).toBeInstanceOf(Date);
    });

    test('descriptionがnullの場合、nullが返される', () => {
      // Given: descriptionなしでタスクを作成
      const task = TaskEntity.create({
        userId: 'user-uuid-123',
        title: 'テストタスク',
      });

      // Then: descriptionはnull
      expect(task.getDescription()).toBeNull();
    });
  });

  // ==========================================================================
  // ビジネスロジック
  // ==========================================================================
  describe('business logic', () => {
    test('updateTitle()でタイトルが更新され、updatedAtも更新される', async () => {
      // Given: タスクを作成
      const task = TaskEntity.create({
        userId: 'user-uuid-123',
        title: '元のタイトル',
      });
      const originalUpdatedAt = task.getUpdatedAt();

      // 時間差を確保するための待機
      await new Promise((resolve) => setTimeout(resolve, 10));

      // When: タイトルを更新
      task.updateTitle('新しいタイトル');

      // Then: タイトルとupdatedAtが更新される
      expect(task.getTitle()).toBe('新しいタイトル');
      expect(task.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    test('updateDescription()で説明が更新され、updatedAtも更新される', async () => {
      // Given: タスクを作成
      const task = TaskEntity.create({
        userId: 'user-uuid-123',
        title: 'タスク',
      });
      const originalUpdatedAt = task.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // When: 説明を更新
      task.updateDescription('新しい説明');

      // Then: 説明とupdatedAtが更新される
      expect(task.getDescription()).toBe('新しい説明');
      expect(task.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    test('updateDescription()でnullを設定できる', () => {
      // Given: 説明付きでタスクを作成
      const task = TaskEntity.create({
        userId: 'user-uuid-123',
        title: 'タスク',
        description: '元の説明',
      });

      // When: 説明をnullに更新
      task.updateDescription(null);

      // Then: 説明がnullになる
      expect(task.getDescription()).toBeNull();
    });

    test('changePriority()で優先度が変更され、updatedAtも更新される', async () => {
      // Given: タスクを作成
      const task = TaskEntity.create({
        userId: 'user-uuid-123',
        title: 'タスク',
        priority: 'medium',
      });
      const originalUpdatedAt = task.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // When: 優先度を変更
      task.changePriority('high');

      // Then: 優先度とupdatedAtが更新される
      expect(task.getPriority()).toBe('high');
      expect(task.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    test('changeStatus()でステータスが変更され、updatedAtも更新される', async () => {
      // Given: タスクを作成
      const task = TaskEntity.create({
        userId: 'user-uuid-123',
        title: 'タスク',
      });
      const originalUpdatedAt = task.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // When: ステータスを変更
      task.changeStatus('completed');

      // Then: ステータスとupdatedAtが更新される
      expect(task.getStatus()).toBe('completed');
      expect(task.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    test('equals()で同一IDの場合trueを返す', () => {
      // Given: 同じpropsで2つのタスクを復元
      const props = {
        id: 'same-task-id',
        userId: 'user-uuid-123',
        title: TaskTitle.create('タスク'),
        description: null,
        priority: TaskPriority.create('medium'),
        status: TaskStatus.create('not_started'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const task1 = TaskEntity.reconstruct(props);
      const task2 = TaskEntity.reconstruct({
        ...props,
        title: TaskTitle.create('別のタイトル'),
      });

      // Then: 同一IDなのでtrue
      expect(task1.equals(task2)).toBe(true);
    });

    test('equals()で異なるIDの場合falseを返す', () => {
      // Given: 異なるIDで2つのタスクを作成
      const task1 = TaskEntity.create({
        userId: 'user-uuid-123',
        title: 'タスク1',
      });
      const task2 = TaskEntity.create({
        userId: 'user-uuid-123',
        title: 'タスク2',
      });

      // Then: 異なるIDなのでfalse
      expect(task1.equals(task2)).toBe(false);
    });
  });
});
