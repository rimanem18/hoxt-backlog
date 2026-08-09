import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import { InvalidTaskDataError } from '@/task/domain/errors/InvalidTaskDataError';
import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import { TaskEntity } from '@/task/domain/TaskEntity';
import { UpdateTaskUseCase } from '../UpdateTaskUseCase';

describe('UpdateTaskUseCase', () => {
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

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const taskId = '660e8400-e29b-41d4-a716-446655440001';
  const projectId = '770e8400-e29b-41d4-a716-446655440002';
  const mockProject = { getId: () => projectId } as ProjectEntity;

  beforeEach(() => {
    // Given: 既存タスクを返すモックリポジトリを初期化
    const existingTask = TaskEntity.create({
      userId,
      title: '元のタイトル',
      description: '元の説明',
      priority: 'low',
      projectId: null,
    });
    mockRepository = {
      save: mock(),
      findByUserId: mock(),
      findById: mock(() => Promise.resolve(existingTask)),
      update: mock((_userId: string, _taskId: string, task: TaskEntity) =>
        Promise.resolve(task),
      ),
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
    test('タイトルのみ更新できる', async () => {
      // When: タイトルのみ更新
      const result = await useCase.execute({
        userId,
        taskId,
        data: { title: '新しいタイトル' },
      });

      // Then: タイトルが更新され、説明・優先度は元のまま
      expect(result.getTitle()).toBe('新しいタイトル');
      expect(result.getDescription()).toBe('元の説明');
      expect(result.getPriority()).toBe('low');
    });

    test('説明文をnullに更新できる', async () => {
      // When: 説明文をnullに更新
      const result = await useCase.execute({
        userId,
        taskId,
        data: { description: null },
      });

      // Then: 説明文がnullになり、タイトルは元のまま
      expect(result.getDescription()).toBeNull();
      expect(result.getTitle()).toBe('元のタイトル');
    });

    test('優先度のみ更新できる', async () => {
      // When: 優先度のみ更新
      const result = await useCase.execute({
        userId,
        taskId,
        data: { priority: 'high' },
      });

      // Then: 優先度が更新される
      expect(result.getPriority()).toBe('high');
    });

    test('projectId未指定時は所有権検証をスキップする', async () => {
      // When: projectIdを含まない更新データで実行
      await useCase.execute({
        userId,
        taskId,
        data: { title: '新しいタイトル' },
      });

      // Then: IProjectRepositoryは呼び出されない
      expect(mockProjectRepository.findById).not.toHaveBeenCalled();
    });

    test('projectIdを指定すると所属projectを変更できる（所有権検証込み）', async () => {
      // When: projectIdを指定して実行
      const result = await useCase.execute({
        userId,
        taskId,
        data: { projectId },
      });

      // Then: 所有権検証が実施され、projectIdが更新される
      expect(mockProjectRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith(
        userId,
        projectId,
      );
      expect(result.getProjectId()).toBe(projectId);
    });

    test('ITaskRepository.findById()にuserId・taskIdを渡して1回だけ呼び出す', async () => {
      // When: ユースケースを実行
      await useCase.execute({ userId, taskId, data: { title: '更新' } });

      // Then: findByIdが1回のみ呼び出される
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.findById).toHaveBeenCalledWith(userId, taskId);
    });

    test('ITaskRepository.update()に検証済みEntityを渡して1回だけ呼び出す', async () => {
      // When: ユースケースを実行
      await useCase.execute({ userId, taskId, data: { title: '新しい名前' } });

      // Then: updateが1回のみ呼び出され、変更が反映されたEntityが渡される
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      const [calledUserId, calledTaskId, calledTask] = mockRepository.update
        .mock.calls[0] as [string, string, TaskEntity];
      expect(calledUserId).toBe(userId);
      expect(calledTaskId).toBe(taskId);
      expect(calledTask.getTitle()).toBe('新しい名前');
    });
  });

  describe('異常系', () => {
    test('タスクが見つからない場合TaskNotFoundErrorがスローされる', async () => {
      // Given: findByIdがnullを返す設定（タスクが存在しない）
      mockRepository.findById = mock(() => Promise.resolve(null));

      // When & Then: TaskNotFoundErrorがスローされる
      await expect(
        useCase.execute({ userId, taskId, data: { title: '更新' } }),
      ).rejects.toThrow(TaskNotFoundError);
    });

    test('不正なタイトル（空文字）を指定するとInvalidTaskDataErrorが発生する', async () => {
      // When & Then: InvalidTaskDataErrorがスローされる
      await expect(
        useCase.execute({ userId, taskId, data: { title: '   ' } }),
      ).rejects.toThrow(InvalidTaskDataError);
    });

    test('不正な優先度を指定するとInvalidTaskDataErrorが発生する', async () => {
      // When & Then: InvalidTaskDataErrorがスローされる
      await expect(
        useCase.execute({ userId, taskId, data: { priority: 'invalid' } }),
      ).rejects.toThrow(InvalidTaskDataError);
    });

    test('他ユーザーのprojectIdを指定するとProjectNotFoundErrorが発生する', async () => {
      // Given: 所有権のないprojectId（リポジトリがnullを返す）
      mockProjectRepository.findById = mock(() => Promise.resolve(null));

      // When & Then: ProjectNotFoundErrorがスローされ、taskは更新されない
      await expect(
        useCase.execute({ userId, taskId, data: { projectId } }),
      ).rejects.toThrow(ProjectNotFoundError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    test('更新直前にタスクが削除された場合TaskNotFoundErrorがスローされる', async () => {
      // Given: update()がnullを返す設定（更新直前の競合状態）
      mockRepository.update = mock(() => Promise.resolve(null));

      // When & Then: TaskNotFoundErrorがスローされる
      await expect(
        useCase.execute({ userId, taskId, data: { title: '更新' } }),
      ).rejects.toThrow(TaskNotFoundError);
    });

    test('リポジトリエラーが正しく伝播する', async () => {
      // Given: リポジトリがエラーをスローする設定
      const repositoryError = new Error('Database connection failed');
      mockRepository.update = mock(() => Promise.reject(repositoryError));

      // When & Then: リポジトリエラーがそのまま伝播する
      await expect(
        useCase.execute({ userId, taskId, data: { title: '更新' } }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
