import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { InvalidTaskDataError } from '@/domain/task/errors/InvalidTaskDataError';
import { TaskNotFoundError } from '@/domain/task/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/domain/task/ITaskRepository';
import { DeleteTaskUseCase } from '../DeleteTaskUseCase';

describe('DeleteTaskUseCase', () => {
  type MockTaskRepository = {
    save: ReturnType<typeof mock>;
    findByUserId: ReturnType<typeof mock>;
    findById: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    updateStatus: ReturnType<typeof mock>;
  };

  let mockRepository: MockTaskRepository;
  let useCase: DeleteTaskUseCase;

  beforeEach(() => {
    // Given: モックリポジトリを初期化
    mockRepository = {
      save: mock(),
      findByUserId: mock(),
      findById: mock(),
      update: mock(),
      delete: mock(() => Promise.resolve(true)),
      updateStatus: mock(),
    };
    useCase = new DeleteTaskUseCase(
      mockRepository as unknown as ITaskRepository,
    );
  });

  describe('正常系', () => {
    test('タスクが正常に削除される', async () => {
      // Given: 有効な入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
      };

      // When & Then: ユースケースを実行し、voidで正常終了する
      await expect(useCase.execute(input)).resolves.toBeUndefined();
      expect(mockRepository.delete).toHaveBeenCalledTimes(1);
      expect(mockRepository.delete).toHaveBeenCalledWith(
        input.userId,
        input.taskId,
      );
    });
  });

  describe('異常系', () => {
    test('空文字列のuserIdでInvalidTaskDataErrorがスローされる', async () => {
      // Given: 空文字列のuserId
      const input = {
        userId: '',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
      };

      // When & Then: InvalidTaskDataErrorがスローされる
      await expect(useCase.execute(input)).rejects.toThrow(
        InvalidTaskDataError,
      );
    });

    test('空文字列のtaskIdでInvalidTaskDataErrorがスローされる', async () => {
      // Given: 空文字列のtaskId
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '',
      };

      // When & Then: InvalidTaskDataErrorがスローされる
      await expect(useCase.execute(input)).rejects.toThrow(
        InvalidTaskDataError,
      );
    });

    test('空白文字のみのuserIdでInvalidTaskDataErrorがスローされる', async () => {
      // Given: 空白文字のみのuserId
      const input = {
        userId: '   ',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
      };

      // When & Then: InvalidTaskDataErrorがスローされる
      await expect(useCase.execute(input)).rejects.toThrow(
        InvalidTaskDataError,
      );
    });

    test('存在しないタスクを削除しようとするとTaskNotFoundErrorがスローされる', async () => {
      // Given: リポジトリがfalseを返す（タスクが見つからない）
      mockRepository.delete = mock(() => Promise.resolve(false));
      useCase = new DeleteTaskUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '999e8400-e29b-41d4-a716-446655440999',
      };

      // When & Then: TaskNotFoundErrorがスローされ、エラーメッセージにtaskIdが含まれる
      const error = await useCase.execute(input).catch((e) => e);
      expect(error).toBeInstanceOf(TaskNotFoundError);
      expect(error.message).toContain(input.taskId);
    });

    test('リポジトリエラーが正しく伝播する', async () => {
      // Given: リポジトリがエラーをスローする設定
      const repositoryError = new Error('Database connection failed');
      mockRepository.delete = mock(() => Promise.reject(repositoryError));
      useCase = new DeleteTaskUseCase(
        mockRepository as unknown as ITaskRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
      };

      // When & Then: リポジトリエラーがそのまま伝播する
      await expect(useCase.execute(input)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
