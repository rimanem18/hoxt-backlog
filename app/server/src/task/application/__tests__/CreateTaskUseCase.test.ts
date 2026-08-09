import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import type { TaskEntity } from '@/task/domain/TaskEntity';
import { CreateTaskUseCase } from '../CreateTaskUseCase';

describe('CreateTaskUseCase', () => {
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
  let useCase: CreateTaskUseCase;

  const mockProjectId = '770e8400-e29b-41d4-a716-446655440002';
  const mockProject = { getId: () => mockProjectId } as ProjectEntity;

  beforeEach(() => {
    // Given: モックリポジトリを初期化（デフォルトは自分のprojectが見つかる設定）
    mockRepository = {
      save: mock((task: TaskEntity) => Promise.resolve(task)),
      findByUserId: mock(),
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
    useCase = new CreateTaskUseCase(
      mockRepository as unknown as ITaskRepository,
      mockProjectRepository as unknown as IProjectRepository,
    );
  });

  describe('正常系', () => {
    test('タイトルのみ指定でタスクが作成される（デフォルト値が適用される）', async () => {
      // Given: タイトルのみの入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: '会議の資料を準備する',
        projectId: mockProjectId,
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: タスクが正しく作成される
      expect(result.getId()).toBeDefined();
      expect(result.getUserId()).toBe(input.userId);
      expect(result.getTitle()).toBe('会議の資料を準備する');
      expect(result.getDescription()).toBeNull();
      expect(result.getPriority()).toBe('medium');
      expect(result.getStatus()).toBe('not_started');
      expect(result.getProjectId()).toBe(mockProjectId);
    });

    test('全フィールド指定でタスクが作成される', async () => {
      // Given: 全フィールドを指定した入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: '緊急: 本番障害対応',
        description: '## 対応内容\n- ログ確認\n- 原因調査',
        priority: 'high',
        projectId: mockProjectId,
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: 指定した値でタスクが作成される
      expect(result.getTitle()).toBe('緊急: 本番障害対応');
      expect(result.getDescription()).toBe(
        '## 対応内容\n- ログ確認\n- 原因調査',
      );
      expect(result.getPriority()).toBe('high');
      expect(result.getStatus()).toBe('not_started');
      expect(result.getProjectId()).toBe(mockProjectId);
    });

    test('ITaskRepository.save()が呼び出される', async () => {
      // Given: 有効な入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'テストタスク',
        projectId: mockProjectId,
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリのsaveが1回呼び出される
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    test('IProjectRepository.findById()が1回だけ呼び出される（N+1回避）', async () => {
      // Given: 有効な入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'テストタスク',
        projectId: mockProjectId,
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: 所有権検証は1回のみ
      expect(mockProjectRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith(
        input.userId,
        mockProjectId,
      );
    });
  });

  describe('異常系', () => {
    test('空文字タイトルでエラーが発生する', async () => {
      // Given: 空文字のタイトル
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: '',
        projectId: mockProjectId,
      };

      // When & Then: エラーがスローされる
      await expect(useCase.execute(input)).rejects.toThrow();
    });

    test('100文字超のタイトルでエラーが発生する', async () => {
      // Given: 101文字のタイトル
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'a'.repeat(101),
        projectId: mockProjectId,
      };

      // When & Then: エラーがスローされる
      await expect(useCase.execute(input)).rejects.toThrow();
    });

    test('不正な優先度でエラーが発生する', async () => {
      // Given: 存在しない優先度
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'テストタスク',
        priority: 'invalid_priority',
        projectId: mockProjectId,
      };

      // When & Then: エラーがスローされる
      await expect(useCase.execute(input)).rejects.toThrow();
    });

    test('他ユーザーのprojectIdを指定するとProjectNotFoundErrorが発生する', async () => {
      // Given: 所有権のないprojectId（リポジトリがnullを返す）
      mockProjectRepository.findById = mock(() => Promise.resolve(null));
      useCase = new CreateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'テストタスク',
        projectId: mockProjectId,
      };

      // When & Then: ProjectNotFoundErrorがスローされ、taskは保存されない
      await expect(useCase.execute(input)).rejects.toThrow(
        ProjectNotFoundError,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    test('リポジトリエラーが正しく伝播する', async () => {
      // Given: リポジトリがエラーをスローする設定
      const repositoryError = new Error('Database connection failed');
      mockRepository.save = mock(() => Promise.reject(repositoryError));
      useCase = new CreateTaskUseCase(
        mockRepository as unknown as ITaskRepository,
        mockProjectRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'テストタスク',
        projectId: mockProjectId,
      };

      // When & Then: リポジトリエラーがそのまま伝播する
      await expect(useCase.execute(input)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
