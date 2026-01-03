import { beforeEach, describe, expect, test } from 'bun:test';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { InvalidTaskDataError, TaskNotFoundError } from '@/domain/task/errors';
import type { MockUseCases } from './helpers';
import { createMockTaskEntity, mockUseCases } from './helpers';

describe('taskRoutes統合テスト', () => {
  let app: OpenAPIHono;
  let useCases: MockUseCases;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    useCases = mockUseCases();

    const { createTaskRoutes } = await import('../taskRoutes');

    app = createTaskRoutes({
      createTaskUseCase: useCases.createTaskUseCase as any,
      getTasksUseCase: useCases.getTasksUseCase as any,
      getTaskByIdUseCase: useCases.getTaskByIdUseCase as any,
      updateTaskUseCase: useCases.updateTaskUseCase as any,
      deleteTaskUseCase: useCases.deleteTaskUseCase as any,
      changeTaskStatusUseCase: useCases.changeTaskStatusUseCase as any,
      authMiddlewareOptions: {
        mockPayload: {
          sub: mockUserId,
          email: 'test@example.com',
        },
      },
    });
  });

  describe('ルート登録テスト', () => {
    test('6つのエンドポイントが正しく登録される', () => {
      // Given: アプリケーションが初期化されている

      // When: ルート一覧を取得
      const routes = app.routes;

      // Then: 6つ以上のルートが登録されている
      expect(routes.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('POST /tasks - タスク作成', () => {
    test('正常系: タスク作成が成功し201 Createdを返す', async () => {
      // Given: タスク作成用のモックデータとUseCaseの準備
      const mockTask = createMockTaskEntity({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: mockUserId,
        title: '会議資料の作成',
        priority: 'high',
      });
      useCases.createTaskUseCase.execute.mockResolvedValue(mockTask);

      // When: POST /tasksでタスク作成リクエストを送信
      const res = await app.request('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          title: '会議資料の作成',
          priority: 'high',
        }),
      });

      // Then: 201 Createdレスポンスと作成されたタスクデータを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('会議資料の作成');
    });
  });

  describe('GET /tasks - タスク一覧取得', () => {
    test('正常系: タスク一覧取得が成功し200 OKを返す', async () => {
      // Given: 2つのタスクを返すUseCaseを準備
      const mockTasks = [
        createMockTaskEntity({ title: 'タスク1' }),
        createMockTaskEntity({ title: 'タスク2' }),
      ];
      useCases.getTasksUseCase.execute.mockResolvedValue(mockTasks);

      // When: GET /tasksでタスク一覧取得リクエストを送信
      const res = await app.request('/tasks', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });

      // Then: 200 OKレスポンスと2件のタスクデータを返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.length).toBe(2);
    });
  });

  describe('GET /tasks/:id - タスク詳細取得', () => {
    test('正常系: タスク詳細取得が成功し200 OKを返す', async () => {
      // Given: 特定IDのタスクを返すUseCaseを準備
      const mockTask = createMockTaskEntity({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      useCases.getTaskByIdUseCase.execute.mockResolvedValue(mockTask);

      // When: GET /tasks/:idでタスク詳細取得リクエストを送信
      const res = await app.request(
        '/tasks/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer mock-token',
          },
        },
      );

      // Then: 200 OKレスポンスと指定IDのタスクデータを返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('PUT /tasks/:id - タスク更新', () => {
    test('正常系: タスク更新が成功し200 OKを返す', async () => {
      // Given: 更新後のタスクを返すUseCaseを準備
      const mockTask = createMockTaskEntity({
        title: '更新されたタイトル',
      });
      useCases.updateTaskUseCase.execute.mockResolvedValue(mockTask);

      // When: PUT /tasks/:idでタスク更新リクエストを送信
      const res = await app.request(
        '/tasks/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({
            title: '更新されたタイトル',
          }),
        },
      );

      // Then: 200 OKレスポンスと更新されたタスクデータを返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('更新されたタイトル');
    });
  });

  describe('DELETE /tasks/:id - タスク削除', () => {
    test('正常系: タスク削除が成功し204 No Contentを返す', async () => {
      // Given: タスク削除が成功するUseCaseを準備
      useCases.deleteTaskUseCase.execute.mockResolvedValue(undefined);

      // When: DELETE /tasks/:idでタスク削除リクエストを送信
      const res = await app.request(
        '/tasks/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer mock-token',
          },
        },
      );

      // Then: 204 No Contentレスポンスを返す
      expect(res.status).toBe(204);
    });
  });

  describe('PATCH /tasks/:id/status - ステータス変更', () => {
    test('正常系: ステータス変更が成功し200 OKを返す', async () => {
      // Given: ステータス変更後のタスクを返すUseCaseを準備
      const mockTask = createMockTaskEntity({
        status: 'in_progress',
      });
      useCases.changeTaskStatusUseCase.execute.mockResolvedValue(mockTask);

      // When: PATCH /tasks/:id/statusでステータス変更リクエストを送信
      const res = await app.request(
        '/tasks/550e8400-e29b-41d4-a716-446655440000/status',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({
            status: 'in_progress',
          }),
        },
      );

      // Then: 200 OKレスポンスと変更されたステータスのタスクを返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('in_progress');
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('異常系: TaskNotFoundErrorで404 Not Foundを返す', async () => {
      // Given: TaskNotFoundErrorを発生させるUseCaseを準備
      useCases.getTaskByIdUseCase.execute.mockRejectedValue(
        new TaskNotFoundError('タスクが見つかりません'),
      );

      // When: 存在しないタスクIDでGETリクエストを送信
      const res = await app.request(
        '/tasks/00000000-0000-0000-0000-000000000000',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer mock-token',
          },
        },
      );

      // Then: 404 Not Foundエラーレスポンスを返す
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('異常系: InvalidTaskDataErrorで400 Bad Requestを返す', async () => {
      // Given: InvalidTaskDataErrorを発生させるUseCaseを準備
      useCases.createTaskUseCase.execute.mockRejectedValue(
        new InvalidTaskDataError('タイトルを入力してください'),
      );

      // When: タスク作成リクエストを送信
      const res = await app.request('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          title: 'valid title',
        }),
      });

      // Then: 400 Bad Requestバリデーションエラーレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('異常系: 未知エラーで500 Internal Server Errorを返す', async () => {
      // Given: 予期しないエラーを発生させるUseCaseを準備
      useCases.createTaskUseCase.execute.mockRejectedValue(
        new Error('予期しないエラー'),
      );

      // When: タスク作成リクエストを送信
      const res = await app.request('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          title: 'テスト',
        }),
      });

      // Then: 500 Internal Server Errorレスポンスを返す
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    test('異常系: AuthError（JWT未提供）で401 Unauthorizedを返す', async () => {
      // Given: authMiddlewareOptionsなし（JWTなし）でアプリを作成
      const { createTaskRoutes } = await import('../taskRoutes');
      const appWithoutAuth = createTaskRoutes({
        createTaskUseCase: useCases.createTaskUseCase as any,
        getTasksUseCase: useCases.getTasksUseCase as any,
        getTaskByIdUseCase: useCases.getTaskByIdUseCase as any,
        updateTaskUseCase: useCases.updateTaskUseCase as any,
        deleteTaskUseCase: useCases.deleteTaskUseCase as any,
        changeTaskStatusUseCase: useCases.changeTaskStatusUseCase as any,
        // authMiddlewareOptions を渡さない（AuthError発生）
      });

      // When: Authorizationヘッダーなしでリクエスト
      const res = await appWithoutAuth.request('/tasks', {
        method: 'GET',
      });

      // Then: 401 Unauthorizedレスポンスを返す
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('RLS動作確認', () => {
    test('authMiddlewareから正しいuserIdが渡される', async () => {
      // Given: mockUserIdでタスクを返すUseCaseを準備
      const mockTask = createMockTaskEntity({ userId: mockUserId });
      useCases.createTaskUseCase.execute.mockResolvedValue(mockTask);

      // When: タスク作成リクエストを送信
      await app.request('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          title: 'RLSテスト',
        }),
      });

      // Then: UseCaseに正しいuserIdが渡される
      expect(useCases.createTaskUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });
  });
});
