import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Context } from 'hono';
import type { CreateTaskUseCase } from '@/application/usecases/CreateTaskUseCase';
import type { GetTaskByIdUseCase } from '@/application/usecases/GetTaskByIdUseCase';
import type { GetTasksUseCase } from '@/application/usecases/GetTasksUseCase';
import { InvalidTaskDataError, TaskNotFoundError } from '@/domain/task/errors';
import { TaskEntity } from '@/domain/task/TaskEntity';
import { TaskController } from '../TaskController';

describe('TaskController', () => {
  let controller: TaskController;
  let mockCreateTaskUseCase: {
    execute: ReturnType<typeof mock>;
  };
  let mockGetTasksUseCase: {
    execute: ReturnType<typeof mock>;
  };
  let mockGetTaskByIdUseCase: {
    execute: ReturnType<typeof mock>;
  };
  let mockContext: Context;

  beforeEach(() => {
    // モックのユースケース作成
    mockCreateTaskUseCase = {
      execute: mock(),
    };
    mockGetTasksUseCase = {
      execute: mock(),
    };
    mockGetTaskByIdUseCase = {
      execute: mock(),
    };

    // コントローラのインスタンス化
    controller = new TaskController(
      mockCreateTaskUseCase as unknown as CreateTaskUseCase,
      mockGetTasksUseCase as unknown as GetTasksUseCase,
      mockGetTaskByIdUseCase as unknown as GetTaskByIdUseCase,
    );

    // モックのHonoコンテキスト作成
    mockContext = {
      get: mock(),
      req: {
        json: mock(),
        query: mock(),
        param: mock(),
      },
      json: mock(),
    } as unknown as Context;
  });

  afterEach(() => {
    mock.restore();
  });

  describe('create', () => {
    test('タスク作成の正常系: 有効なリクエストで201とタスクデータを返す', async () => {
      // Given: 認証済みユーザーと有効なリクエストボディ
      const userId = 'user-123';
      const requestBody = {
        title: 'テストタスク',
        description: 'テストの説明',
        priority: 'high',
      };

      // TaskEntity のモック作成
      const mockTaskEntity = TaskEntity.create({
        userId,
        title: requestBody.title,
        description: requestBody.description,
        priority: requestBody.priority,
      });

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockCreateTaskUseCase.execute.mockResolvedValue(mockTaskEntity);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 201,
      } as Response);

      // When: createメソッドを呼び出す
      await controller.create(mockContext);

      // Then: 201レスポンスが返される
      expect(mockContext.get).toHaveBeenCalledWith('userId');
      expect(mockContext.req.json).toHaveBeenCalled();
      expect(mockCreateTaskUseCase.execute).toHaveBeenCalledWith({
        userId,
        title: requestBody.title,
        description: requestBody.description,
        priority: requestBody.priority,
      });
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: {
            id: mockTaskEntity.getId(),
            userId: mockTaskEntity.getUserId(),
            title: mockTaskEntity.getTitle(),
            description: mockTaskEntity.getDescription(),
            priority: mockTaskEntity.getPriority(),
            status: mockTaskEntity.getStatus(),
            createdAt: mockTaskEntity.getCreatedAt().toISOString(),
            updatedAt: mockTaskEntity.getUpdatedAt().toISOString(),
          },
        },
        201,
      );
    });

    test('タスク作成の正常系: descriptionなしで201を返す', async () => {
      // Given: descriptionを含まないリクエスト
      const userId = 'user-123';
      const requestBody = {
        title: 'シンプルタスク',
        priority: 'medium',
      };

      const mockTaskEntity = TaskEntity.create({
        userId,
        title: requestBody.title,
        priority: requestBody.priority,
      });

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockCreateTaskUseCase.execute.mockResolvedValue(mockTaskEntity);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 201,
      } as Response);

      // When: createメソッドを呼び出す
      await controller.create(mockContext);

      // Then: descriptionなしでユースケースが呼ばれる
      expect(mockCreateTaskUseCase.execute).toHaveBeenCalledWith({
        userId,
        title: requestBody.title,
        priority: requestBody.priority,
      });
    });

    test('バリデーションエラー: ユースケースがInvalidTaskDataErrorをスローする', async () => {
      // Given: 無効なタイトル
      const userId = 'user-123';
      const requestBody = {
        title: '', // 空文字列（無効）
      };

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockCreateTaskUseCase.execute.mockRejectedValue(
        new InvalidTaskDataError('タイトルは1文字以上必要です'),
      );

      // When & Then: エラーがスローされる（errorMiddlewareでキャッチされる）
      await expect(controller.create(mockContext)).rejects.toThrow(
        InvalidTaskDataError,
      );
    });
  });

  describe('getAll', () => {
    test('タスク一覧取得の正常系: 複数タスクを200で返す', async () => {
      // Given: 認証済みユーザーとクエリパラメータ
      const userId = 'user-123';
      const queryParams = {
        priority: 'high',
        status: 'pending,in_progress',
        sort: 'created_at_desc',
      };

      const mockTasks = [
        TaskEntity.create({
          userId,
          title: 'タスク1',
          priority: 'high',
        }),
        TaskEntity.create({
          userId,
          title: 'タスク2',
          priority: 'high',
        }),
      ];

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.query as ReturnType<typeof mock>).mockReturnValue(
        queryParams,
      );
      mockGetTasksUseCase.execute.mockResolvedValue(mockTasks);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: getAllメソッドを呼び出す
      await controller.getAll(mockContext);

      // Then: 200レスポンスが返される
      expect(mockContext.get).toHaveBeenCalledWith('userId');
      expect(mockContext.req.query).toHaveBeenCalled();
      expect(mockGetTasksUseCase.execute).toHaveBeenCalledWith({
        userId,
        filters: {
          priority: 'high',
          status: ['pending', 'in_progress'],
        },
        sort: 'created_at_desc',
      });
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: mockTasks.map((task) => ({
            id: task.getId(),
            userId: task.getUserId(),
            title: task.getTitle(),
            description: task.getDescription(),
            priority: task.getPriority(),
            status: task.getStatus(),
            createdAt: task.getCreatedAt().toISOString(),
            updatedAt: task.getUpdatedAt().toISOString(),
          })),
        },
        200,
      );
    });

    test('タスク一覧取得の正常系: フィルタなしでデフォルト値を使用', async () => {
      // Given: クエリパラメータなし
      const userId = 'user-123';
      const queryParams = {};

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.query as ReturnType<typeof mock>).mockReturnValue(
        queryParams,
      );
      mockGetTasksUseCase.execute.mockResolvedValue([]);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: getAllメソッドを呼び出す
      await controller.getAll(mockContext);

      // Then: デフォルト値でユースケースが呼ばれる
      expect(mockGetTasksUseCase.execute).toHaveBeenCalledWith({
        userId,
        filters: {},
        sort: 'created_at_desc',
      });
    });

    test('タスク一覧取得の正常系: 空配列を200で返す', async () => {
      // Given: タスクが存在しない
      const userId = 'user-123';
      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.query as ReturnType<typeof mock>).mockReturnValue({});
      mockGetTasksUseCase.execute.mockResolvedValue([]);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: getAllメソッドを呼び出す
      await controller.getAll(mockContext);

      // Then: 空配列が返される
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: [],
        },
        200,
      );
    });

    test('statusパラメータ: 複数値をカンマ区切りで配列に変換', async () => {
      // Given: status複数指定
      const userId = 'user-123';
      const queryParams = {
        status: 'pending,in_progress,completed',
      };

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.query as ReturnType<typeof mock>).mockReturnValue(
        queryParams,
      );
      mockGetTasksUseCase.execute.mockResolvedValue([]);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: getAllメソッドを呼び出す
      await controller.getAll(mockContext);

      // Then: status配列でユースケースが呼ばれる
      expect(mockGetTasksUseCase.execute).toHaveBeenCalledWith({
        userId,
        filters: {
          status: ['pending', 'in_progress', 'completed'],
        },
        sort: 'created_at_desc',
      });
    });

    test('statusパラメータ: スペースを含むカンマ区切り値を正しくトリミング', async () => {
      // Given: スペースを含むstatus指定
      const userId = 'user-123';
      const queryParams = {
        status: 'pending, in_progress, completed',
      };

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.query as ReturnType<typeof mock>).mockReturnValue(
        queryParams,
      );
      mockGetTasksUseCase.execute.mockResolvedValue([]);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: getAllメソッドを呼び出す
      await controller.getAll(mockContext);

      // Then: スペースがトリミングされた配列でユースケースが呼ばれる
      expect(mockGetTasksUseCase.execute).toHaveBeenCalledWith({
        userId,
        filters: {
          status: ['pending', 'in_progress', 'completed'],
        },
        sort: 'created_at_desc',
      });
    });
  });

  describe('getById', () => {
    test('タスク詳細取得の正常系: タスクIDで単一タスクを200で返す', async () => {
      // Given: 認証済みユーザーとタスクID
      const userId = 'user-123';
      const taskId = 'task-456';

      const mockTask = TaskEntity.create({
        userId,
        title: 'タスク詳細',
        description: '詳細説明',
      });

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      mockGetTaskByIdUseCase.execute.mockResolvedValue(mockTask);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: getByIdメソッドを呼び出す
      await controller.getById(mockContext);

      // Then: 200レスポンスが返される
      expect(mockContext.get).toHaveBeenCalledWith('userId');
      expect(mockContext.req.param).toHaveBeenCalledWith('id');
      expect(mockGetTaskByIdUseCase.execute).toHaveBeenCalledWith({
        userId,
        taskId,
      });
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: {
            id: mockTask.getId(),
            userId: mockTask.getUserId(),
            title: mockTask.getTitle(),
            description: mockTask.getDescription(),
            priority: mockTask.getPriority(),
            status: mockTask.getStatus(),
            createdAt: mockTask.getCreatedAt().toISOString(),
            updatedAt: mockTask.getUpdatedAt().toISOString(),
          },
        },
        200,
      );
    });

    test('タスクが見つからない: ユースケースがTaskNotFoundErrorをスローする', async () => {
      // Given: 存在しないタスクID
      const userId = 'user-123';
      const taskId = 'non-existent-task';

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      mockGetTaskByIdUseCase.execute.mockRejectedValue(
        TaskNotFoundError.forTaskId(taskId),
      );

      // When & Then: エラーがスローされる（errorMiddlewareでキャッチされる）
      await expect(controller.getById(mockContext)).rejects.toThrow(
        TaskNotFoundError,
      );
    });
  });
});
