import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { ITaskChangeNotifier } from '@/task/application/ports/ITaskChangeNotifier';
import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
import { TaskChangeNotifierRegistry } from '@/task/infrastructure/TaskChangeNotifierRegistry';
import { ChangeTaskStatusUseCase } from '../ChangeTaskStatusUseCase';

// テスト用のステータス値定義（TaskStatusの許容値と同期）
const TASK_STATUS_VALUES = [
  'not_started',
  'in_progress',
  'in_review',
  'completed',
] as const;

describe('ChangeTaskStatusUseCase', () => {
  // モックリポジトリの型定義
  type MockTaskRepository = {
    save: ReturnType<typeof mock>;
    findByUserId: ReturnType<typeof mock>;
    findById: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    updateStatus: ReturnType<typeof mock>;
  };

  let mockRepository: MockTaskRepository;
  let useCase: ChangeTaskStatusUseCase;

  // テスト用のモックタスクエンティティを作成するヘルパー
  const createMockTask = (overrides: Partial<TaskEntity> = {}): TaskEntity => {
    return {
      getId: () => overrides.getId?.() ?? 'task-1',
      getUserId: () => overrides.getUserId?.() ?? 'user-1',
      getTitle: () => overrides.getTitle?.() ?? 'Test Task',
      getDescription: () => overrides.getDescription?.() ?? null,
      getPriority: () => overrides.getPriority?.() ?? 'medium',
      getStatus: () => overrides.getStatus?.() ?? 'not_started',
      getCreatedAt: () => overrides.getCreatedAt?.() ?? new Date(),
      getUpdatedAt: () => overrides.getUpdatedAt?.() ?? new Date(),
      getProjectId: () =>
        overrides.getProjectId?.() ?? '770e8400-e29b-41d4-a716-446655440002',
    } as TaskEntity;
  };

  beforeEach(() => {
    // Given: モックリポジトリを初期化
    mockRepository = {
      save: mock(),
      findByUserId: mock(),
      findById: mock(),
      update: mock(),
      delete: mock(),
      updateStatus: mock(() => Promise.resolve(null)),
    };
    useCase = new ChangeTaskStatusUseCase(
      mockRepository as unknown as ITaskRepository,
    );
  });

  describe('正常系', () => {
    test('ステータスが変更される（リポジトリが正しく呼び出される）', async () => {
      // Given: 存在するタスクIDとステータス
      const mockTask = createMockTask({
        getId: () => '660e8400-e29b-41d4-a716-446655440001',
        getUserId: () => '550e8400-e29b-41d4-a716-446655440000',
        getStatus: () => 'in_progress',
      });
      mockRepository.updateStatus = mock(() => Promise.resolve(mockTask));
      useCase = new ChangeTaskStatusUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        status: 'in_progress',
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリが正しいパラメータで1回だけ呼び出される
      expect(mockRepository.updateStatus).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
        'in_progress',
      );
    });

    test('リポジトリの戻り値がそのまま返される（結果透過性）', async () => {
      // Given: リポジトリが更新されたタスクを返す設定
      const mockTask = createMockTask({
        getId: () => '660e8400-e29b-41d4-a716-446655440001',
        getStatus: () => 'completed',
      });
      mockRepository.updateStatus = mock(() => Promise.resolve(mockTask));
      useCase = new ChangeTaskStatusUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        status: 'completed',
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: リポジトリの戻り値がそのまま返される
      expect(result).toBe(mockTask);
      expect(result.getId()).toBe('660e8400-e29b-41d4-a716-446655440001');
      expect(result.getStatus()).toBe('completed');
    });

    // 各ステータス値への変更が可能かをパラメータ化テストで検証
    test.each([...TASK_STATUS_VALUES])(
      'ステータス "%s" への変更が正しく処理される',
      async (status: string) => {
        // Given: 指定されたステータスに変更する設定
        const mockTask = createMockTask({
          getId: () => '660e8400-e29b-41d4-a716-446655440001',
          getStatus: () => status,
        });
        mockRepository.updateStatus = mock(() => Promise.resolve(mockTask));
        useCase = new ChangeTaskStatusUseCase(
          mockRepository as unknown as ITaskRepository,
        );

        const input = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          taskId: '660e8400-e29b-41d4-a716-446655440001',
          status,
        };

        // When: ユースケースを実行
        const result = await useCase.execute(input);

        // Then: リポジトリに正しいステータスが渡され、結果が返される
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
          '550e8400-e29b-41d4-a716-446655440000',
          '660e8400-e29b-41d4-a716-446655440001',
          status,
        );
        expect(result.getStatus()).toBe(status);
      },
    );
  });

  describe('異常系', () => {
    test('タスクが見つからない場合TaskNotFoundErrorがスローされる', async () => {
      // Given: リポジトリがnullを返す設定（タスクが存在しない）
      mockRepository.updateStatus = mock(() => Promise.resolve(null));
      useCase = new ChangeTaskStatusUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: 'nonexistent-task-id',
        status: 'completed',
      };

      // When & Then: TaskNotFoundErrorがスローされる
      await expect(useCase.execute(input)).rejects.toThrow(TaskNotFoundError);

      // エラーのcodeプロパティも検証
      try {
        await useCase.execute(input);
      } catch (error) {
        expect(error).toBeInstanceOf(TaskNotFoundError);
        expect((error as TaskNotFoundError).code).toBe('TASK_NOT_FOUND');
      }
    });

    test('リポジトリエラーが正しく伝播する', async () => {
      // Given: リポジトリがエラーをスローする設定
      const repositoryError = new Error('Database connection failed');
      mockRepository.updateStatus = mock(() => Promise.reject(repositoryError));
      useCase = new ChangeTaskStatusUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        status: 'in_progress',
      };

      // When & Then: リポジトリエラーがそのまま伝播する
      await expect(useCase.execute(input)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('task変更通知（RISK-02: fail-open）', () => {
    afterEach(() => {
      TaskChangeNotifierRegistry.resetForTesting();
    });

    test.each(['in_progress', 'not_started'] as const)(
      'ステータス変更成功時に%sへの変更でstatus_changedイベントでnotify()がawaitされて呼ばれる（AC-02: 前進・後退どちらの遷移でも）',
      async (status) => {
        // Given: notify()をモック化した通知実装を登録する
        const notify = mock(() => Promise.resolve());
        const mockNotifier: ITaskChangeNotifier = { notify };
        TaskChangeNotifierRegistry.setNotifier(mockNotifier);
        const mockTask = createMockTask({
          getId: () => '660e8400-e29b-41d4-a716-446655440001',
          getTitle: () => 'テストタスク',
          getStatus: () => status,
          getProjectId: () => '770e8400-e29b-41d4-a716-446655440002',
        });
        mockRepository.updateStatus = mock(() => Promise.resolve(mockTask));
        useCase = new ChangeTaskStatusUseCase(
          mockRepository as unknown as ITaskRepository,
        );

        const input = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          taskId: '660e8400-e29b-41d4-a716-446655440001',
          status,
        };

        // When: ユースケースを実行
        await useCase.execute(input);

        // Then: 変更後のステータスを含むイベントでnotify()が呼ばれる
        expect(notify).toHaveBeenCalledWith({
          type: 'status_changed',
          taskId: '660e8400-e29b-41d4-a716-446655440001',
          taskTitle: 'テストタスク',
          projectId: '770e8400-e29b-41d4-a716-446655440002',
          newStatus: status,
        });
      },
    );

    test('notify()が失敗してもUseCaseの戻り値・例外に影響しない', async () => {
      // Given: 常に失敗する通知実装を登録する
      const notify = mock(() =>
        Promise.reject(new Error('送信に失敗しました')),
      );
      const mockNotifier: ITaskChangeNotifier = { notify };
      TaskChangeNotifierRegistry.setNotifier(mockNotifier);
      const mockTask = createMockTask({
        getId: () => '660e8400-e29b-41d4-a716-446655440001',
        getStatus: () => 'completed',
      });
      mockRepository.updateStatus = mock(() => Promise.resolve(mockTask));
      useCase = new ChangeTaskStatusUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        status: 'completed',
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: notify()の失敗に関わらず結果は正常に返る
      expect(result.getStatus()).toBe('completed');
      expect(notify).toHaveBeenCalledTimes(1);
    });
  });
});
