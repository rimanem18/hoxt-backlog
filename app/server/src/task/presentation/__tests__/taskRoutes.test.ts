import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { ProjectNotFoundError } from '@/project/domain/errors';
import { InvalidTaskDataError, TaskNotFoundError } from '@/task/domain/errors';
import type { IUserRepository } from '@/user/domain/IUserRepository';
import type { User } from '@/user/domain/UserEntity';
import type { MockUseCases } from './helpers';
import { createMockTaskEntity, mockUseCases } from './helpers';

describe('taskRoutes統合テスト', () => {
  let app: OpenAPIHono;
  let useCases: MockUseCases;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProjectId = '770e8400-e29b-41d4-a716-446655440002';

  beforeEach(async () => {
    useCases = mockUseCases();

    // モックユーザーエンティティ（各テストで新規生成）
    const mockUser: User = {
      id: mockUserId,
      externalId: 'google-oauth2|123456789',
      provider: 'google',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    // モックユーザーリポジトリ（各テストで新規生成）
    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(mockUser)),
      findById: mock(() => Promise.resolve(mockUser)),
      findByEmail: mock(() => Promise.resolve(null)),
      findByIds: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve(mockUser)),
      update: mock(() => Promise.resolve(mockUser)),
      delete: mock(() => Promise.resolve()),
    };

    const { createTaskRoutes } = await import('../taskRoutes');

    app = createTaskRoutes({
      createTaskUseCase: useCases.createTaskUseCase,
      getTasksUseCase: useCases.getTasksUseCase,
      getTaskByIdUseCase: useCases.getTaskByIdUseCase,
      updateTaskUseCase: useCases.updateTaskUseCase,
      deleteTaskUseCase: useCases.deleteTaskUseCase,
      changeTaskStatusUseCase: useCases.changeTaskStatusUseCase,
      authMiddlewareOptions: {
        userRepository: mockUserRepository,
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
          projectId: mockProjectId,
        }),
      });

      // Then: 201 Createdレスポンスと作成されたタスクデータを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('会議資料の作成');
    });

    test('異常系: projectId未指定で400 VALIDATION_ERRORを返す（AC-03）', async () => {
      // Given: projectIdを含まないリクエストボディ

      // When: projectIdなしでPOST /tasksリクエストを送信
      const res = await app.request('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          title: '会議資料の作成',
        }),
      });

      // Then: 400 VALIDATION_ERRORレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('異常系: 他ユーザーのprojectId指定でProjectNotFoundErrorが404を返す', async () => {
      // Given: 他ユーザーのprojectIdでProjectNotFoundErrorを発生させるUseCase
      useCases.createTaskUseCase.execute.mockRejectedValue(
        ProjectNotFoundError.forProjectId(mockProjectId),
      );

      // When: POST /tasksでタスク作成リクエストを送信
      const res = await app.request('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          title: '会議資料の作成',
          projectId: mockProjectId,
        }),
      });

      // Then: 404 NOT_FOUNDレスポンスを返す
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
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

    test('正常系: project未所属taskがprojectId未指定時の一覧に引き続き含まれる（AC-04相当）', async () => {
      // Given: project未所属task（projectId=null）を返すUseCase
      const mockTasks = [
        createMockTaskEntity({ title: '未所属タスク', projectId: null }),
      ];
      useCases.getTasksUseCase.execute.mockResolvedValue(mockTasks);

      // When: projectId未指定でGET /tasksリクエストを送信
      const res = await app.request('/tasks', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });

      // Then: project未所属taskが含まれる
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].projectId).toBeNull();
    });

    test('正常系: projectIdクエリでそのprojectのtaskのみ取得できる（AC-10相当）', async () => {
      // Given: 指定projectに紐づくtaskを返すUseCase
      const mockTasks = [
        createMockTaskEntity({ title: 'プロジェクト所属タスク' }),
      ];
      useCases.getTasksUseCase.execute.mockResolvedValue(mockTasks);

      // When: projectIdクエリ付きでGET /tasksリクエストを送信
      const res = await app.request(`/tasks?projectId=${mockProjectId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });

      // Then: 200 OKレスポンスとfiltersにprojectIdが渡される
      expect(res.status).toBe(200);
      expect(useCases.getTasksUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ projectId: mockProjectId }),
        }),
      );
    });

    test('正常系: 対象projectにtaskが0件の場合は空配列を返す（AC-10相当）', async () => {
      // Given: 対象projectにtaskが存在しない
      useCases.getTasksUseCase.execute.mockResolvedValue([]);

      // When: projectIdクエリ付きでGET /tasksリクエストを送信
      const res = await app.request(`/tasks?projectId=${mockProjectId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });

      // Then: 空配列を返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual([]);
    });

    test('異常系: 他ユーザー・存在しないprojectId指定で404を返す', async () => {
      // Given: ProjectNotFoundErrorを発生させるUseCase
      useCases.getTasksUseCase.execute.mockRejectedValue(
        ProjectNotFoundError.forProjectId(mockProjectId),
      );

      // When: projectIdクエリ付きでGET /tasksリクエストを送信
      const res = await app.request(`/tasks?projectId=${mockProjectId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });

      // Then: 404 NOT_FOUNDレスポンスを返す
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
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

    test('正常系: projectIdを指定して所属projectを変更できる（AC-05相当）', async () => {
      // Given: 別projectへの変更後タスクを返すUseCase
      const mockTask = createMockTaskEntity({ projectId: mockProjectId });
      useCases.updateTaskUseCase.execute.mockResolvedValue(mockTask);

      // When: PUT /tasks/:idでprojectId変更リクエストを送信
      const res = await app.request(
        '/tasks/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({
            projectId: mockProjectId,
          }),
        },
      );

      // Then: 200 OKレスポンスと変更後のprojectIdを返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.projectId).toBe(mockProjectId);
    });

    test('異常系: 他ユーザーのprojectId指定でProjectNotFoundErrorが404を返す', async () => {
      // Given: 他ユーザーのprojectIdでProjectNotFoundErrorを発生させるUseCase
      useCases.updateTaskUseCase.execute.mockRejectedValue(
        ProjectNotFoundError.forProjectId(mockProjectId),
      );

      // When: PUT /tasks/:idでprojectId変更リクエストを送信
      const res = await app.request(
        '/tasks/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({
            projectId: mockProjectId,
          }),
        },
      );

      // Then: 404 NOT_FOUNDレスポンスを返す
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
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
          projectId: mockProjectId,
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
          projectId: mockProjectId,
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
        createTaskUseCase: useCases.createTaskUseCase,
        getTasksUseCase: useCases.getTasksUseCase,
        getTaskByIdUseCase: useCases.getTaskByIdUseCase,
        updateTaskUseCase: useCases.updateTaskUseCase,
        deleteTaskUseCase: useCases.deleteTaskUseCase,
        changeTaskStatusUseCase: useCases.changeTaskStatusUseCase,
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
          projectId: mockProjectId,
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
