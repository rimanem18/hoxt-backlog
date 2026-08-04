import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
import { GetTasksUseCase } from '../GetTasksUseCase';

describe('GetTasksUseCase', () => {
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
  let useCase: GetTasksUseCase;

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
      findByUserId: mock(() => Promise.resolve([])),
      findById: mock(),
      update: mock(),
      delete: mock(),
      updateStatus: mock(),
    };
    mockProjectRepository = {
      save: mock(),
      findById: mock(() => Promise.resolve(mockProject)),
      findByUserId: mock(),
      update: mock(),
    };
    useCase = new GetTasksUseCase(
      mockRepository as unknown as ITaskRepository,
      mockProjectRepository as unknown as IProjectRepository,
    );
  });

  describe('正常系', () => {
    test('フィルタなしで全タスク取得（リポジトリが正しく呼び出される）', async () => {
      // Given: フィルタなしの入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: {},
        sort: 'created_at_desc' as const,
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリが正しいパラメータで呼び出される
      expect(mockRepository.findByUserId).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        {},
        'created_at_desc',
      );
    });

    test('projectId未指定時は所有権検証をスキップする', async () => {
      // Given: フィルタなしの入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: {},
        sort: 'created_at_desc' as const,
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: IProjectRepositoryは呼び出されない
      expect(mockProjectRepository.findById).not.toHaveBeenCalled();
    });

    test('優先度フィルタが正しく渡される', async () => {
      // Given: 優先度フィルタを指定した入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: { priority: 'high' },
        sort: 'created_at_desc' as const,
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリに優先度フィルタが渡される
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        { priority: 'high' },
        'created_at_desc',
      );
    });

    test('ステータスフィルタ（複数選択）が正しく渡される', async () => {
      // Given: 複数ステータスフィルタを指定した入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: { status: ['not_started', 'in_progress'] },
        sort: 'created_at_desc' as const,
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリにステータスフィルタが渡される
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        { status: ['not_started', 'in_progress'] },
        'created_at_desc',
      );
    });

    test('ソート順が正しく渡される', async () => {
      // Given: 作成日時（古い順）のソートを指定した入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: {},
        sort: 'created_at_asc' as const,
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリに正しいソート順が渡される
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        {},
        'created_at_asc',
      );
    });

    test('該当タスクなし（空配列を返す）', async () => {
      // Given: リポジトリが空配列を返す設定
      mockRepository.findByUserId = mock(() => Promise.resolve([]));
      useCase = new GetTasksUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: { priority: 'high', status: ['completed'] },
        sort: 'created_at_desc' as const,
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: 空配列が返される
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    test('リポジトリの戻り値がそのまま返される（結果透過性）', async () => {
      // Given: リポジトリが複数のタスクを返す設定
      const mockTasks = [
        createMockTask({ getId: () => 'task-1' }),
        createMockTask({ getId: () => 'task-2' }),
      ];
      mockRepository.findByUserId = mock(() => Promise.resolve(mockTasks));
      useCase = new GetTasksUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: {},
        sort: 'created_at_desc' as const,
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: リポジトリの戻り値がそのまま返される
      expect(result).toBe(mockTasks);
      expect(result.length).toBe(2);
    });

    test('projectIdフィルタ指定時は所有権検証後にそのprojectのtaskのみ取得する', async () => {
      // Given: projectIdフィルタを指定した入力
      const mockTasks = [
        createMockTask({
          getId: () => 'task-1',
          getProjectId: () => mockProjectId,
        }),
      ];
      mockRepository.findByUserId = mock(() => Promise.resolve(mockTasks));
      useCase = new GetTasksUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: { projectId: mockProjectId },
        sort: 'created_at_desc' as const,
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: 所有権検証が1回実施され、フィルタがそのまま伝播する
      expect(mockProjectRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith(
        input.userId,
        mockProjectId,
      );
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        { projectId: mockProjectId },
        'created_at_desc',
      );
      expect(result).toBe(mockTasks);
    });

    test('projectIdフィルタ指定時に対象projectのtaskが0件でも空配列を返す', async () => {
      // Given: 対象projectに紐づくtaskが存在しない
      mockRepository.findByUserId = mock(() => Promise.resolve([]));
      useCase = new GetTasksUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: { projectId: mockProjectId },
        sort: 'created_at_desc' as const,
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: 空配列が返される
      expect(result).toEqual([]);
    });
  });

  describe('異常系', () => {
    test('他ユーザー・存在しないprojectIdを指定するとProjectNotFoundErrorが発生する', async () => {
      // Given: 所有権のないprojectId（リポジトリがnullを返す）
      mockProjectRepository.findById = mock(() => Promise.resolve(null));
      useCase = new GetTasksUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: { projectId: mockProjectId },
        sort: 'created_at_desc' as const,
      };

      // When & Then: ProjectNotFoundErrorがスローされ、ITaskRepositoryへの問い合わせは行われない
      await expect(useCase.execute(input)).rejects.toThrow(
        ProjectNotFoundError,
      );
      expect(mockRepository.findByUserId).not.toHaveBeenCalled();
    });

    test('リポジトリエラーが正しく伝播する', async () => {
      // Given: リポジトリがエラーをスローする設定
      const repositoryError = new Error('Database connection failed');
      mockRepository.findByUserId = mock(() => Promise.reject(repositoryError));
      useCase = new GetTasksUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        filters: {},
        sort: 'created_at_desc' as const,
      };

      // When & Then: リポジトリエラーがそのまま伝播する
      await expect(useCase.execute(input)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
