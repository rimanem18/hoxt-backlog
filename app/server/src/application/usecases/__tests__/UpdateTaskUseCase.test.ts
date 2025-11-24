import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { TaskNotFoundError } from '@/domain/task/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/domain/task/ITaskRepository';
import type { TaskEntity } from '@/domain/task/TaskEntity';
import { UpdateTaskUseCase } from '../UpdateTaskUseCase';

describe('UpdateTaskUseCase', () => {
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
  let useCase: UpdateTaskUseCase;

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
    } as TaskEntity;
  };

  beforeEach(() => {
    // Given: モックリポジトリを初期化
    mockRepository = {
      save: mock(),
      findByUserId: mock(),
      findById: mock(),
      update: mock(() => Promise.resolve(null)),
      delete: mock(),
      updateStatus: mock(),
    };
    useCase = new UpdateTaskUseCase(
      mockRepository as unknown as ITaskRepository,
    );
  });

  describe('正常系', () => {
    test('タスクが更新される（リポジトリが正しく呼び出される）', async () => {
      // Given: 存在するタスクIDと更新データ
      const mockTask = createMockTask({
        getId: () => '660e8400-e29b-41d4-a716-446655440001',
        getUserId: () => '550e8400-e29b-41d4-a716-446655440000',
        getTitle: () => '更新されたタイトル',
      });
      mockRepository.update = mock(() => Promise.resolve(mockTask));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        data: { title: '更新されたタイトル' },
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリが正しいパラメータで1回だけ呼び出される
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
        { title: '更新されたタイトル' },
      );
    });

    test('リポジトリの戻り値がそのまま返される（結果透過性）', async () => {
      // Given: リポジトリが更新されたタスクを返す設定
      const mockTask = createMockTask({
        getId: () => '660e8400-e29b-41d4-a716-446655440001',
        getTitle: () => '更新後のタイトル',
      });
      mockRepository.update = mock(() => Promise.resolve(mockTask));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        data: { title: '更新後のタイトル' },
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: リポジトリの戻り値がそのまま返される
      expect(result).toBe(mockTask);
      expect(result.getId()).toBe('660e8400-e29b-41d4-a716-446655440001');
      expect(result.getTitle()).toBe('更新後のタイトル');
    });

    test('descriptionにnullを渡した場合も正しく転送される', async () => {
      // Given: descriptionをnullに更新するデータ
      const mockTask = createMockTask({
        getId: () => '660e8400-e29b-41d4-a716-446655440001',
        getDescription: () => null,
      });
      mockRepository.update = mock(() => Promise.resolve(mockTask));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        data: { description: null },
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリにnullが正しく渡される
      expect(mockRepository.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
        { description: null },
      );
    });
  });

  describe('異常系', () => {
    test('タスクが見つからない場合TaskNotFoundErrorがスローされる', async () => {
      // Given: リポジトリがnullを返す設定（タスクが存在しない）
      mockRepository.update = mock(() => Promise.resolve(null));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: 'nonexistent-task-id',
        data: { title: '更新' },
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
      mockRepository.update = mock(() => Promise.reject(repositoryError));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        data: { title: '更新' },
      };

      // When & Then: リポジトリエラーがそのまま伝播する
      await expect(useCase.execute(input)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
