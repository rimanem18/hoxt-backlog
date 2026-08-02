/**
 * 認証→タスク作成フロー統合テスト
 *
 * authMiddleware修正の統合検証を実施。
 * JWT検証 → DB検索 → タスク作成の完全フローをエンドツーエンドでテストし、
 * 外部キー制約違反が発生しないことを確認する。
 */

import { describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMockTaskEntity } from '@/task/presentation/__tests__/helpers';
import type { TaskRoutesDependencies } from '@/task/presentation/taskRoutes';
import { createTaskRoutes } from '@/task/presentation/taskRoutes';
import type { AuthProvider } from '@/user/domain/AuthProvider';
import type { IUserRepository } from '@/user/domain/IUserRepository';
import type { User } from '@/user/domain/UserEntity';
import authRoutes from '../authRoutes';

describe('認証→タスク作成フロー統合テスト', () => {
  test('POST /auth/verify → POST /tasks が外部キー制約違反なく成功', async () => {
    // Given: DBに存在するユーザー
    const dbUserId = 'db-uuid-12345-from-verify';
    const externalId = 'external-id-from-supabase';

    const mockUser: User = {
      id: dbUserId,
      externalId: externalId,
      provider: 'google' as AuthProvider,
      email: 'integration-test@example.com',
      name: 'Integration Test User',
      avatarUrl: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: null,
    };

    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(mockUser)),
      findById: mock(() => Promise.resolve(mockUser)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(mockUser)),
      update: mock(() => Promise.resolve(mockUser)),
      delete: mock(() => Promise.resolve()),
    };

    // Given: テスト用のモックペイロード（JWT検証をバイパス）
    const mockPayload = {
      sub: externalId,
      email: 'integration-test@example.com',
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
    };

    // Given: タスク作成成功時のモックレスポンス
    const createdTask = createMockTaskEntity({
      id: 'task-uuid-created-successfully',
      userId: dbUserId, // DBのUUIDを使用
      title: 'Integration Test Task',
      description:
        'This task should be created without FK constraint violation',
      priority: 'high',
      status: 'not_started',
    });

    const mockCreateTaskUseCase = {
      execute: mock(() => Promise.resolve(createdTask)),
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
    } as any;

    // Given: taskRoutesにモック依存関係を注入
    const taskRoutesDeps: TaskRoutesDependencies = {
      createTaskUseCase: mockCreateTaskUseCase,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      getTasksUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      getTaskByIdUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      updateTaskUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      deleteTaskUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      changeTaskStatusUseCase: { execute: mock() } as any,
      authMiddlewareOptions: {
        userRepository: mockUserRepository,
        mockPayload,
      },
    };

    // Given: Honoアプリケーションの構築
    const app = new Hono();

    // CORSミドルウェアの設定
    app.use(
      '*',
      cors({
        origin: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }),
    );

    // authRoutesとtaskRoutesをマウント
    app.route('/api', authRoutes);
    app.route('/api', createTaskRoutes(taskRoutesDeps));

    // When: タスク作成リクエスト（JWT認証付き）
    const taskResponse = await app.request('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token',
      },
      body: JSON.stringify({
        title: 'Integration Test Task',
        description:
          'This task should be created without FK constraint violation',
        priority: 'high',
        projectId: '770e8400-e29b-41d4-a716-446655440002',
      }),
    });

    // Then: タスク作成が成功（外部キー制約違反なし）
    expect(taskResponse.status).toBe(201);

    const taskResponseBody = await taskResponse.json();
    expect(taskResponseBody.success).toBe(true);
    expect(taskResponseBody.data).toBeDefined();
    expect(taskResponseBody.data.id).toBe('task-uuid-created-successfully');

    // Then: CreateTaskUseCaseが正しいuserIdで呼ばれた
    expect(mockCreateTaskUseCase.execute).toHaveBeenCalledTimes(1);
    const createTaskCallArgs = mockCreateTaskUseCase.execute.mock.calls[0];
    if (createTaskCallArgs?.[0]) {
      expect(createTaskCallArgs[0].userId).toBe(dbUserId); // DBのUUIDが使用されることを確認
    }

    // Then: userRepositoryのfindByExternalIdが呼ばれた
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledTimes(1);
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
      externalId,
      'google',
    );
  });

  test('ユーザーが見つからない場合、タスク作成前に401エラー', async () => {
    // Given: DBにユーザーが存在しない
    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(null)), // ユーザー不在
      findById: mock(() => Promise.resolve(null)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({} as User)),
      update: mock(() => Promise.resolve({} as User)),
      delete: mock(() => Promise.resolve()),
    };

    // Given: テスト用のモックペイロード
    const mockPayload = {
      sub: 'non-existent-external-id',
      email: 'nonexistent@example.com',
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
    };

    // Given: タスク作成UseCaseのモック（呼ばれないはず）
    const mockCreateTaskUseCase = {
      execute: mock(() => Promise.resolve(createMockTaskEntity())),
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
    } as any;

    // Given: taskRoutesにモック依存関係を注入
    const taskRoutesDeps: TaskRoutesDependencies = {
      createTaskUseCase: mockCreateTaskUseCase,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      getTasksUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      getTaskByIdUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      updateTaskUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      deleteTaskUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      changeTaskStatusUseCase: { execute: mock() } as any,
      authMiddlewareOptions: {
        userRepository: mockUserRepository,
        mockPayload,
      },
    };

    // Given: Honoアプリケーションの構築
    const app = new Hono();

    app.use(
      '*',
      cors({
        origin: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }),
    );

    app.route('/api', authRoutes);
    app.route('/api', createTaskRoutes(taskRoutesDeps));

    // When: タスク作成リクエスト（JWT認証付き）
    const taskResponse = await app.request('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token',
      },
      body: JSON.stringify({
        title: 'This task should not be created',
        priority: 'high',
      }),
    });

    // Then: 401エラーレスポンス（authMiddlewareでユーザー不在検出）
    expect(taskResponse.status).toBe(401);

    const taskResponseBody = await taskResponse.json();
    expect(taskResponseBody.success).toBe(false);
    expect(taskResponseBody.error).toBeDefined();
    expect(taskResponseBody.error.code).toBe('USER_NOT_FOUND');

    // Then: CreateTaskUseCaseは呼ばれない（認証で失敗）
    expect(mockCreateTaskUseCase.execute).toHaveBeenCalledTimes(0);

    // Then: findByExternalIdは呼ばれた
    expect(mockUserRepository.findByExternalId).toHaveBeenCalledTimes(1);
  });

  test('JWT検証後、context.userIdにDBのUUIDが設定されてタスク作成される', async () => {
    // Given: DBに存在するユーザー
    const dbUserId = 'db-uuid-context-test';
    const externalId = 'external-id-context-test';

    const mockUser: User = {
      id: dbUserId,
      externalId: externalId,
      provider: 'google' as AuthProvider,
      email: 'context-test@example.com',
      name: 'Context Test User',
      avatarUrl: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: null,
    };

    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(mockUser)),
      findById: mock(() => Promise.resolve(mockUser)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(mockUser)),
      update: mock(() => Promise.resolve(mockUser)),
      delete: mock(() => Promise.resolve()),
    };

    // Given: テスト用のモックペイロード
    const mockPayload = {
      sub: externalId,
      email: 'context-test@example.com',
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
    };

    // Given: タスク作成成功時のモックレスポンス
    const createdTask = createMockTaskEntity({
      id: 'task-uuid-context-test',
      userId: dbUserId,
      title: 'Context Test Task',
      priority: 'medium',
      status: 'not_started',
    });

    const mockCreateTaskUseCase = {
      execute: mock(() => Promise.resolve(createdTask)),
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
    } as any;

    // Given: taskRoutesにモック依存関係を注入
    const taskRoutesDeps: TaskRoutesDependencies = {
      createTaskUseCase: mockCreateTaskUseCase,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      getTasksUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      getTaskByIdUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      updateTaskUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      deleteTaskUseCase: { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとTaskRoutesDependenciesの型互換性のため
      changeTaskStatusUseCase: { execute: mock() } as any,
      authMiddlewareOptions: {
        userRepository: mockUserRepository,
        mockPayload,
      },
    };

    // Given: Honoアプリケーションの構築
    const app = new Hono();

    app.use(
      '*',
      cors({
        origin: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }),
    );

    app.route('/api', authRoutes);
    app.route('/api', createTaskRoutes(taskRoutesDeps));

    // When: タスク作成リクエスト
    const taskResponse = await app.request('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token',
      },
      body: JSON.stringify({
        title: 'Context Test Task',
        priority: 'medium',
        projectId: '770e8400-e29b-41d4-a716-446655440002',
      }),
    });

    // Then: タスク作成が成功
    expect(taskResponse.status).toBe(201);

    const taskResponseBody = await taskResponse.json();
    expect(taskResponseBody.success).toBe(true);
    expect(taskResponseBody.data.userId).toBe(dbUserId); // DBのUUIDが使用される

    // Then: CreateTaskUseCaseがDBのuserIdで呼ばれた（外部IDではない）
    expect(mockCreateTaskUseCase.execute).toHaveBeenCalledTimes(1);
    const createTaskCallArgs = mockCreateTaskUseCase.execute.mock.calls[0];
    if (createTaskCallArgs?.[0]) {
      expect(createTaskCallArgs[0].userId).toBe(dbUserId);
      expect(createTaskCallArgs[0].userId).not.toBe(externalId); // 外部IDではないことを明示的に確認
    }
  });
});
