import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
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

  type MockProjectRepository = {
    save: ReturnType<typeof mock>;
    findById: ReturnType<typeof mock>;
    findByUserId: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };

  let mockRepository: MockTaskRepository;
  let mockProjectRepository: MockProjectRepository;
  let useCase: UpdateTaskUseCase;

  const mockProjectId = '770e8400-e29b-41d4-a716-446655440002';
  const mockProject = { getId: () => mockProjectId } as ProjectEntity;

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
      getProjectId: () => overrides.getProjectId?.() ?? null,
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
    mockProjectRepository = {
      save: mock(),
      findById: mock(() => Promise.resolve(mockProject)),
      findByUserId: mock(),
      update: mock(),
    };
    useCase = new UpdateTaskUseCase(
      mockRepository as unknown as ITaskRepository,
      mockProjectRepository as unknown as IProjectRepository,
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
        mockProjectRepository as unknown as IProjectRepository,
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

    test('projectId未指定時は所有権検証をスキップする', async () => {
      // Given: projectIdを含まない更新データ
      const mockTask = createMockTask();
      mockRepository.update = mock(() => Promise.resolve(mockTask));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        data: { title: '更新されたタイトル' },
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: IProjectRepositoryは呼び出されない
      expect(mockProjectRepository.findById).not.toHaveBeenCalled();
    });

    test('projectIdを指定すると所属projectを変更できる（所有権検証込み）', async () => {
      // Given: 別projectへの変更データ
      const mockTask = createMockTask({
        getProjectId: () => mockProjectId,
      });
      mockRepository.update = mock(() => Promise.resolve(mockTask));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        data: { projectId: mockProjectId },
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: 所有権検証が1回実施され、taskRepository.updateに反映される
      expect(mockProjectRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith(
        input.userId,
        mockProjectId,
      );
      expect(mockRepository.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
        { projectId: mockProjectId },
      );
      expect(result.getProjectId()).toBe(mockProjectId);
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
        mockProjectRepository as unknown as IProjectRepository,
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
        mockProjectRepository as unknown as IProjectRepository,
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

    test('他ユーザーのprojectIdを指定するとProjectNotFoundErrorが発生する', async () => {
      // Given: 所有権のないprojectId（リポジトリがnullを返す）
      mockProjectRepository.findById = mock(() => Promise.resolve(null));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: '660e8400-e29b-41d4-a716-446655440001',
        data: { projectId: mockProjectId },
      };

      // When & Then: ProjectNotFoundErrorがスローされ、taskは更新されない
      await expect(useCase.execute(input)).rejects.toThrow(
        ProjectNotFoundError,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    test('リポジトリエラーが正しく伝播する', async () => {
      // Given: リポジトリがエラーをスローする設定
      const repositoryError = new Error('Database connection failed');
      mockRepository.update = mock(() => Promise.reject(repositoryError));
      useCase = new UpdateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
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
