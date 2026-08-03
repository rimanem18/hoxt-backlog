import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { OpenAPIHono } from '@hono/zod-openapi';
import {
  InvalidProjectDataError,
  ProjectNotFoundError,
} from '@/project/domain/errors';
import type { IUserRepository } from '@/user/domain/IUserRepository';
import type { User } from '@/user/domain/UserEntity';
import type { MockUseCases } from './helpers';
import { createMockProjectEntity, mockUseCases } from './helpers';

describe('projectRoutes統合テスト', () => {
  let app: OpenAPIHono;
  let useCases: MockUseCases;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

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
      create: mock(() => Promise.resolve(mockUser)),
      update: mock(() => Promise.resolve(mockUser)),
      delete: mock(() => Promise.resolve()),
    };

    const { createProjectRoutes } = await import('../projectRoutes');

    app = createProjectRoutes({
      createProjectUseCase: useCases.createProjectUseCase,
      getProjectsUseCase: useCases.getProjectsUseCase,
      getProjectByIdUseCase: useCases.getProjectByIdUseCase,
      updateProjectUseCase: useCases.updateProjectUseCase,
      authMiddlewareOptions: {
        userRepository: mockUserRepository,
        mockPayload: {
          sub: mockUserId,
          email: 'test@example.com',
        },
      },
    });
  });

  describe('POST /projects - プロジェクト作成', () => {
    test('正常系: 名前のみでプロジェクト作成が成功し201 Createdを返す（AC-01）', async () => {
      // Given: 名前のみのプロジェクト作成用モックデータ
      const mockProject = createMockProjectEntity({
        name: '新規プロジェクト',
        description: null,
      });
      useCases.createProjectUseCase.execute.mockResolvedValue(mockProject);

      // When: POST /projectsでプロジェクト作成リクエストを送信
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ name: '新規プロジェクト' }),
      });

      // Then: 201 Createdレスポンスと作成されたプロジェクトデータを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('新規プロジェクト');
      expect(data.data.description).toBeNull();
    });

    test('正常系: 名前+説明文でプロジェクト作成が成功し201 Createdを返す（AC-02）', async () => {
      // Given: 名前と説明文を指定したプロジェクト作成用モックデータ
      const mockProject = createMockProjectEntity({
        name: 'リニューアルプロジェクト',
        description: 'サイトリニューアルのためのプロジェクト',
      });
      useCases.createProjectUseCase.execute.mockResolvedValue(mockProject);

      // When: POST /projectsでプロジェクト作成リクエストを送信
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          name: 'リニューアルプロジェクト',
          description: 'サイトリニューアルのためのプロジェクト',
        }),
      });

      // Then: 201 Createdレスポンスと作成されたプロジェクトデータを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('リニューアルプロジェクト');
      expect(data.data.description).toBe(
        'サイトリニューアルのためのプロジェクト',
      );
    });

    test('正常系: 同名プロジェクトの重複作成が201のまま成功する（AC-07）', async () => {
      // Given: 既に同名のプロジェクトが存在する状態を模したモック
      const mockProject = createMockProjectEntity({ name: '重複プロジェクト' });
      useCases.createProjectUseCase.execute.mockResolvedValue(mockProject);

      // When: 同名プロジェクトを作成するリクエストを送信
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ name: '重複プロジェクト' }),
      });

      // Then: 201 Createdレスポンスを返す（重複はエラーにならない）
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test('異常系: 名前未入力で400 Bad Requestを返す', async () => {
      // When: 名前未入力でプロジェクト作成リクエストを送信
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({}),
      });

      // Then: 400 Bad Requestバリデーションエラーレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 空白のみの名前で400 Bad Requestを返す', async () => {
      // Given: InvalidProjectDataErrorを発生させるUseCaseを準備
      useCases.createProjectUseCase.execute.mockRejectedValue(
        new InvalidProjectDataError('名前を入力してください'),
      );

      // When: 空白のみの名前でプロジェクト作成リクエストを送信
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ name: '   ' }),
      });

      // Then: 400 Bad Requestバリデーションエラーレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('異常系: 101文字の名前で400 Bad Requestを返す', async () => {
      // When: 101文字の名前でプロジェクト作成リクエストを送信
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      });

      // Then: 400 Bad Requestバリデーションエラーレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 未知エラーで500 Internal Server Errorを返す', async () => {
      // Given: 予期しないエラーを発生させるUseCaseを準備
      useCases.createProjectUseCase.execute.mockRejectedValue(
        new Error('予期しないエラー'),
      );

      // When: プロジェクト作成リクエストを送信
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ name: '正常な名前' }),
      });

      // Then: 500 Internal Server Errorレスポンスを返す
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 認証なしで401 Unauthorizedを返す', async () => {
      // When: Authorizationヘッダーなしでプロジェクト作成リクエストを送信
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: '正常な名前' }),
      });

      // Then: 401 Unauthorizedレスポンスを返す
      expect(res.status).toBe(401);
    });
  });

  describe('GET /projects - プロジェクト一覧取得', () => {
    test('正常系: 自分のプロジェクト一覧を取得し200 OKを返す', async () => {
      // Given: 自分のプロジェクト一覧を返すモック
      const mockProjects = [
        createMockProjectEntity({ id: 'p1', name: 'プロジェクト1' }),
        createMockProjectEntity({ id: 'p2', name: 'プロジェクト2' }),
      ];
      useCases.getProjectsUseCase.execute.mockResolvedValue(mockProjects);

      // When: GET /projectsでプロジェクト一覧を取得
      const res = await app.request('/projects', {
        method: 'GET',
        headers: { Authorization: 'Bearer mock-token' },
      });

      // Then: 200 OKレスポンスと自分のプロジェクト一覧を返す（AC-06）
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    test('正常系: プロジェクトが0件の場合は空配列を返す', async () => {
      // Given: 空配列を返すモック
      useCases.getProjectsUseCase.execute.mockResolvedValue([]);

      // When: GET /projectsでプロジェクト一覧を取得
      const res = await app.request('/projects', {
        method: 'GET',
        headers: { Authorization: 'Bearer mock-token' },
      });

      // Then: 200 OKレスポンスと空配列を返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    test('異常系: 認証なしで401 Unauthorizedを返す', async () => {
      // When: Authorizationヘッダーなしでプロジェクト一覧を取得
      const res = await app.request('/projects', { method: 'GET' });

      // Then: 401 Unauthorizedレスポンスを返す
      expect(res.status).toBe(401);
    });
  });

  describe('GET /projects/{id} - プロジェクト詳細取得', () => {
    test('正常系: 自分のプロジェクト詳細を取得し200 OKを返す', async () => {
      // Given: 自分のプロジェクトを返すモック
      const mockProject = createMockProjectEntity({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '詳細取得プロジェクト',
      });
      useCases.getProjectByIdUseCase.execute.mockResolvedValue(mockProject);

      // When: GET /projects/{id}でプロジェクト詳細を取得
      const res = await app.request(
        '/projects/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer mock-token' },
        },
      );

      // Then: 200 OKレスポンスとプロジェクト詳細を返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('詳細取得プロジェクト');
    });

    test('異常系: 他ユーザーのプロジェクト指定時に404 Not Foundを返す（AC-06）', async () => {
      // Given: ProjectNotFoundErrorを発生させるモック
      useCases.getProjectByIdUseCase.execute.mockRejectedValue(
        new ProjectNotFoundError('550e8400-e29b-41d4-a716-446655440000'),
      );

      // When: 他ユーザーのプロジェクトIDで詳細を取得
      const res = await app.request(
        '/projects/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer mock-token' },
        },
      );

      // Then: 404 Not Foundレスポンスを返す（403ではない）
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 存在しないプロジェクトIDで404 Not Foundを返す', async () => {
      // Given: ProjectNotFoundErrorを発生させるモック
      useCases.getProjectByIdUseCase.execute.mockRejectedValue(
        new ProjectNotFoundError('660e8400-e29b-41d4-a716-446655440099'),
      );

      // When: 存在しないプロジェクトIDで詳細を取得
      const res = await app.request(
        '/projects/660e8400-e29b-41d4-a716-446655440099',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer mock-token' },
        },
      );

      // Then: 404 Not Foundレスポンスを返す
      expect(res.status).toBe(404);
    });

    test('異常系: 認証なしで401 Unauthorizedを返す', async () => {
      // When: Authorizationヘッダーなしでプロジェクト詳細を取得
      const res = await app.request(
        '/projects/550e8400-e29b-41d4-a716-446655440000',
        { method: 'GET' },
      );

      // Then: 401 Unauthorizedレスポンスを返す
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /projects/{id} - プロジェクト編集', () => {
    test('正常系: 自分のプロジェクトの名称・説明文を更新し200 OKを返す（AC-08）', async () => {
      // Given: 更新後のプロジェクトを返すモック
      const mockProject = createMockProjectEntity({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '更新後の名前',
        description: '更新後の説明',
      });
      useCases.updateProjectUseCase.execute.mockResolvedValue(mockProject);

      // When: PUT /projects/{id}で更新リクエストを送信
      const res = await app.request(
        '/projects/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({
            name: '更新後の名前',
            description: '更新後の説明',
          }),
        },
      );

      // Then: 200 OKレスポンスと更新後のプロジェクトデータを返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('更新後の名前');
      expect(data.data.description).toBe('更新後の説明');
    });

    test('異常系: 空白のみの名前で400 Bad Requestを返す（AC-09）', async () => {
      // When: 空白のみの名前で更新リクエストを送信
      const res = await app.request(
        '/projects/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({ name: '   ' }),
        },
      );

      // Then: 400 Bad Requestバリデーションエラーレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 101文字の名前で400 Bad Requestを返す（AC-09）', async () => {
      // When: 101文字の名前で更新リクエストを送信
      const res = await app.request(
        '/projects/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({ name: 'a'.repeat(101) }),
        },
      );

      // Then: 400 Bad Requestバリデーションエラーレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 他ユーザーのプロジェクト指定時に404 Not Foundを返す（AC-09）', async () => {
      // Given: ProjectNotFoundErrorを発生させるモック
      useCases.updateProjectUseCase.execute.mockRejectedValue(
        new ProjectNotFoundError('550e8400-e29b-41d4-a716-446655440000'),
      );

      // When: 他ユーザーのプロジェクトIDで更新リクエストを送信
      const res = await app.request(
        '/projects/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({ name: '新しい名前' }),
        },
      );

      // Then: 404 Not Foundレスポンスを返す（403ではない）
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 認証なしで401 Unauthorizedを返す', async () => {
      // When: Authorizationヘッダーなしで更新リクエストを送信
      const res = await app.request(
        '/projects/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '新しい名前' }),
        },
      );

      // Then: 401 Unauthorizedレスポンスを返す
      expect(res.status).toBe(401);
    });
  });
});
