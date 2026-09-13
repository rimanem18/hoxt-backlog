import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import type { ITaskChangeNotifier } from '@/task/application/ports/ITaskChangeNotifier';
import { InvalidTaskDataError } from '@/task/domain/errors/InvalidTaskDataError';
import { TaskNotFoundError } from '@/task/domain/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import { TaskEntity } from '@/task/domain/TaskEntity';
import { TaskChangeNotifierRegistry } from '@/task/infrastructure/TaskChangeNotifierRegistry';
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

  describe('task変更通知（RISK-02: fail-open, REQ-305: project付け替え除外）', () => {
    const originalProjectId = '880e8400-e29b-41d4-a716-446655440003';
    const newProjectId = '990e8400-e29b-41d4-a716-446655440004';

    beforeEach(() => {
      // Given: 既にprojectに所属しているタスクを返すよう上書き
      const existingTask = TaskEntity.create({
        userId,
        title: '元のタイトル',
        description: '元の説明',
        priority: 'low',
        projectId: originalProjectId,
      });
      mockRepository.findById = mock(() => Promise.resolve(existingTask));
      mockProjectRepository.findById = mock(() =>
        Promise.resolve({ getId: () => newProjectId } as ProjectEntity),
      );
    });

    afterEach(() => {
      TaskChangeNotifierRegistry.resetForTesting();
    });

    test('projectIdのみ変更時にnotify()が呼ばれない（AC-09）', async () => {
      // Given: notify()をモック化した通知実装を登録する
      const notify = mock(() => Promise.resolve());
      const mockNotifier: ITaskChangeNotifier = { notify };
      TaskChangeNotifierRegistry.setNotifier(mockNotifier);

      // When: projectIdのみ変更
      await useCase.execute({
        userId,
        taskId,
        data: { projectId: newProjectId },
      });

      // Then: notify()は呼ばれない
      expect(notify).not.toHaveBeenCalled();
    });

    test('priority変更時に変更後のprojectIdを宛先としてnotify()が呼ばれる', async () => {
      // Given: notify()をモック化した通知実装を登録する
      const notify = mock(() => Promise.resolve());
      const mockNotifier: ITaskChangeNotifier = { notify };
      TaskChangeNotifierRegistry.setNotifier(mockNotifier);

      // When: priorityのみ変更（projectIdは元のまま）
      const result = await useCase.execute({
        userId,
        taskId,
        data: { priority: 'high' },
      });

      // Then: 元のprojectId宛にpriority_changedイベントでnotify()が呼ばれる
      expect(notify).toHaveBeenCalledWith({
        type: 'priority_changed',
        taskId: result.getId(),
        taskTitle: result.getTitle(),
        projectId: originalProjectId,
        newPriority: 'high',
      });
    });

    test('priorityとprojectIdが同時に変わった場合、変更後のprojectId宛にpriority_changedイベントが送信される（task_addedではない）', async () => {
      // Given: notify()をモック化した通知実装を登録する
      const notify = mock(() => Promise.resolve());
      const mockNotifier: ITaskChangeNotifier = { notify };
      TaskChangeNotifierRegistry.setNotifier(mockNotifier);

      // When: priorityとprojectIdを同時に変更
      const result = await useCase.execute({
        userId,
        taskId,
        data: { priority: 'high', projectId: newProjectId },
      });

      // Then: 新projectId宛にpriority_changedイベントが送信される
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith({
        type: 'priority_changed',
        taskId: result.getId(),
        taskTitle: result.getTitle(),
        projectId: newProjectId,
        newPriority: 'high',
      });
    });

    test('同一値のpriorityを再設定した場合notify()が呼ばれない', async () => {
      // Given: notify()をモック化した通知実装を登録する
      const notify = mock(() => Promise.resolve());
      const mockNotifier: ITaskChangeNotifier = { notify };
      TaskChangeNotifierRegistry.setNotifier(mockNotifier);

      // When: 既存と同じ値（low）を再設定
      await useCase.execute({
        userId,
        taskId,
        data: { priority: 'low' },
      });

      // Then: notify()は呼ばれない
      expect(notify).not.toHaveBeenCalled();
    });

    test('notify()が失敗してもUseCaseの戻り値・例外に影響しない', async () => {
      // Given: 常に失敗する通知実装を登録する
      const notify = mock(() =>
        Promise.reject(new Error('送信に失敗しました')),
      );
      const mockNotifier: ITaskChangeNotifier = { notify };
      TaskChangeNotifierRegistry.setNotifier(mockNotifier);

      // When: priorityを変更
      const result = await useCase.execute({
        userId,
        taskId,
        data: { priority: 'high' },
      });

      // Then: notify()の失敗に関わらず結果は正常に返る
      expect(result.getPriority()).toBe('high');
      expect(notify).toHaveBeenCalledTimes(1);
    });
  });
});
