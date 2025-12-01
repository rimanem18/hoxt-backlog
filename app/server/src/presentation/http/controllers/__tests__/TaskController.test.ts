import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Context } from 'hono';
import type { ChangeTaskStatusUseCase } from '@/application/usecases/ChangeTaskStatusUseCase';
import type { CreateTaskUseCase } from '@/application/usecases/CreateTaskUseCase';
import type { DeleteTaskUseCase } from '@/application/usecases/DeleteTaskUseCase';
import type { GetTaskByIdUseCase } from '@/application/usecases/GetTaskByIdUseCase';
import type { GetTasksUseCase } from '@/application/usecases/GetTasksUseCase';
import type { UpdateTaskUseCase } from '@/application/usecases/UpdateTaskUseCase';
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
  let mockUpdateTaskUseCase: {
    execute: ReturnType<typeof mock>;
  };
  let mockDeleteTaskUseCase: {
    execute: ReturnType<typeof mock>;
  };
  let mockChangeTaskStatusUseCase: {
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
    mockUpdateTaskUseCase = {
      execute: mock(),
    };
    mockDeleteTaskUseCase = {
      execute: mock(),
    };
    mockChangeTaskStatusUseCase = {
      execute: mock(),
    };

    // コントローラのインスタンス化
    controller = new TaskController(
      mockCreateTaskUseCase as unknown as CreateTaskUseCase,
      mockGetTasksUseCase as unknown as GetTasksUseCase,
      mockGetTaskByIdUseCase as unknown as GetTaskByIdUseCase,
      mockUpdateTaskUseCase as unknown as UpdateTaskUseCase,
      mockDeleteTaskUseCase as unknown as DeleteTaskUseCase,
      mockChangeTaskStatusUseCase as unknown as ChangeTaskStatusUseCase,
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

  describe('update', () => {
    test('タスク更新の正常系: 全フィールド更新で200とタスクデータを返す', async () => {
      // Given: 認証済みユーザーと有効な更新リクエストボディ
      const userId = 'user-123';
      const taskId = 'task-456';
      const requestBody = {
        title: '更新されたタスク',
        description: '更新された説明',
        priority: 'high',
      };

      const mockUpdatedTask = TaskEntity.create({
        userId,
        title: requestBody.title,
        description: requestBody.description,
        priority: requestBody.priority,
      });

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockUpdateTaskUseCase.execute.mockResolvedValue(mockUpdatedTask);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: updateメソッドを呼び出す
      await controller.update(mockContext);

      // Then: 200レスポンスが返される
      expect(mockContext.get).toHaveBeenCalledWith('userId');
      expect(mockContext.req.param).toHaveBeenCalledWith('id');
      expect(mockContext.req.json).toHaveBeenCalled();
      expect(mockUpdateTaskUseCase.execute).toHaveBeenCalledWith({
        userId,
        taskId,
        data: {
          title: requestBody.title,
          description: requestBody.description,
          priority: requestBody.priority,
        },
      });
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: {
            id: mockUpdatedTask.getId(),
            userId: mockUpdatedTask.getUserId(),
            title: mockUpdatedTask.getTitle(),
            description: mockUpdatedTask.getDescription(),
            priority: mockUpdatedTask.getPriority(),
            status: mockUpdatedTask.getStatus(),
            createdAt: mockUpdatedTask.getCreatedAt().toISOString(),
            updatedAt: mockUpdatedTask.getUpdatedAt().toISOString(),
          },
        },
        200,
      );
    });

    test('タスク更新の正常系: 部分更新（titleのみ）で200を返す', async () => {
      // Given: titleのみ更新するリクエスト
      const userId = 'user-123';
      const taskId = 'task-456';
      const requestBody = {
        title: '部分更新されたタイトル',
      };

      const mockUpdatedTask = TaskEntity.create({
        userId,
        title: requestBody.title,
      });

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockUpdateTaskUseCase.execute.mockResolvedValue(mockUpdatedTask);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: updateメソッドを呼び出す
      await controller.update(mockContext);

      // Then: titleのみでユースケースが呼ばれる
      expect(mockUpdateTaskUseCase.execute).toHaveBeenCalledWith({
        userId,
        taskId,
        data: {
          title: requestBody.title,
        },
      });
    });

    test('タスク更新の正常系: descriptionをnullでクリアして200を返す', async () => {
      // Given: descriptionをnullに設定するリクエスト
      const userId = 'user-123';
      const taskId = 'task-456';
      const requestBody = {
        description: null,
      };

      const mockUpdatedTask = TaskEntity.create({
        userId,
        title: '既存タイトル',
      });

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockUpdateTaskUseCase.execute.mockResolvedValue(mockUpdatedTask);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: updateメソッドを呼び出す
      await controller.update(mockContext);

      // Then: descriptionがnullでユースケースが呼ばれる
      expect(mockUpdateTaskUseCase.execute).toHaveBeenCalledWith({
        userId,
        taskId,
        data: {
          description: null,
        },
      });
    });

    test('タスクが見つからない: ユースケースがTaskNotFoundErrorをスローする', async () => {
      // Given: 存在しないタスクIDへの更新リクエスト
      const userId = 'user-123';
      const taskId = 'non-existent-task';
      const requestBody = {
        title: '更新されたタスク',
      };

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockUpdateTaskUseCase.execute.mockRejectedValue(
        TaskNotFoundError.forTaskId(taskId),
      );

      // When & Then: エラーがスローされる（errorMiddlewareでキャッチされる）
      await expect(controller.update(mockContext)).rejects.toThrow(
        TaskNotFoundError,
      );
    });
  });

  describe('delete', () => {
    test('タスク削除の正常系: 204 No Contentを返す', async () => {
      // Given: 認証済みユーザーと削除対象のタスクID
      const userId = 'user-123';
      const taskId = 'task-456';

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      mockDeleteTaskUseCase.execute.mockResolvedValue(undefined);

      const mockBodyFn = mock();
      mockBodyFn.mockReturnValue({
        status: 204,
      } as Response);
      (mockContext as typeof mockContext & { body: typeof mockBodyFn }).body =
        mockBodyFn;

      // When: deleteメソッドを呼び出す
      await controller.delete(mockContext);

      // Then: 204レスポンスが返される
      expect(mockContext.get).toHaveBeenCalledWith('userId');
      expect(mockContext.req.param).toHaveBeenCalledWith('id');
      expect(mockDeleteTaskUseCase.execute).toHaveBeenCalledWith({
        userId,
        taskId,
      });
      expect(mockBodyFn).toHaveBeenCalledWith(null, 204);
    });

    test('タスクが見つからない: ユースケースがTaskNotFoundErrorをスローする', async () => {
      // Given: 存在しないタスクIDへの削除リクエスト
      const userId = 'user-123';
      const taskId = 'non-existent-task';

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      mockDeleteTaskUseCase.execute.mockRejectedValue(
        TaskNotFoundError.forTaskId(taskId),
      );

      // When & Then: エラーがスローされる（errorMiddlewareでキャッチされる）
      await expect(controller.delete(mockContext)).rejects.toThrow(
        TaskNotFoundError,
      );
    });
  });

  describe('changeStatus', () => {
    test('ステータス変更の正常系: 200とタスクデータを返す', async () => {
      // Given: 認証済みユーザーとステータス変更リクエスト
      const userId = 'user-123';
      const taskId = 'task-456';
      const requestBody = {
        status: 'in_progress',
      };

      const mockUpdatedTask = TaskEntity.create({
        userId,
        title: 'タスク',
      });

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockChangeTaskStatusUseCase.execute.mockResolvedValue(mockUpdatedTask);
      (mockContext.json as ReturnType<typeof mock>).mockReturnValue({
        status: 200,
      } as Response);

      // When: changeStatusメソッドを呼び出す
      await controller.changeStatus(mockContext);

      // Then: 200レスポンスが返される
      expect(mockContext.get).toHaveBeenCalledWith('userId');
      expect(mockContext.req.param).toHaveBeenCalledWith('id');
      expect(mockContext.req.json).toHaveBeenCalled();
      expect(mockChangeTaskStatusUseCase.execute).toHaveBeenCalledWith({
        userId,
        taskId,
        status: requestBody.status,
      });
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: {
            id: mockUpdatedTask.getId(),
            userId: mockUpdatedTask.getUserId(),
            title: mockUpdatedTask.getTitle(),
            description: mockUpdatedTask.getDescription(),
            priority: mockUpdatedTask.getPriority(),
            status: mockUpdatedTask.getStatus(),
            createdAt: mockUpdatedTask.getCreatedAt().toISOString(),
            updatedAt: mockUpdatedTask.getUpdatedAt().toISOString(),
          },
        },
        200,
      );
    });

    test('タスクが見つからない: ユースケースがTaskNotFoundErrorをスローする', async () => {
      // Given: 存在しないタスクIDへのステータス変更リクエスト
      const userId = 'user-123';
      const taskId = 'non-existent-task';
      const requestBody = {
        status: 'completed',
      };

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockChangeTaskStatusUseCase.execute.mockRejectedValue(
        TaskNotFoundError.forTaskId(taskId),
      );

      // When & Then: エラーがスローされる（errorMiddlewareでキャッチされる）
      await expect(controller.changeStatus(mockContext)).rejects.toThrow(
        TaskNotFoundError,
      );
    });

    test('バリデーションエラー: ユースケースがInvalidTaskDataErrorをスローする', async () => {
      // Given: 不正なステータス値
      const userId = 'user-123';
      const taskId = 'task-456';
      const requestBody = {
        status: 'invalid_status',
      };

      (mockContext.get as ReturnType<typeof mock>).mockReturnValue(userId);
      (mockContext.req.param as ReturnType<typeof mock>).mockReturnValue(
        taskId,
      );
      (mockContext.req.json as ReturnType<typeof mock>).mockResolvedValue(
        requestBody,
      );
      mockChangeTaskStatusUseCase.execute.mockRejectedValue(
        new InvalidTaskDataError('無効なステータス値です'),
      );

      // When & Then: エラーがスローされる（errorMiddlewareでキャッチされる）
      await expect(controller.changeStatus(mockContext)).rejects.toThrow(
        InvalidTaskDataError,
      );
    });
  });
});
