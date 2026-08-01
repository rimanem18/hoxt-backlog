import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { InvalidProjectDataError } from '@/project/domain/errors';
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
      // biome-ignore lint/suspicious/noExplicitAny: MockUseCasesとProjectRoutesDependenciesの型互換性のため
      createProjectUseCase: useCases.createProjectUseCase as any,
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
});
