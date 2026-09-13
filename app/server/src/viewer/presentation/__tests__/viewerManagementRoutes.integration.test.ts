import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IUserRepository } from '@/user/domain/IUserRepository';
import type { User } from '@/user/domain/UserEntity';
import {
  InvalidViewerDataError,
  InvitationMailDeliveryError,
  ViewerNotFoundError,
} from '@/viewer/domain/errors';
import type { MockUseCases } from './helpers';
import { createMockProjectViewerEntity, mockUseCases } from './helpers';

describe('viewerManagementRoutes統合テスト', () => {
  let app: OpenAPIHono;
  let useCases: MockUseCases;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProjectId = '223e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    useCases = mockUseCases();

    const mockUser: User = {
      id: mockUserId,
      externalId: 'google-oauth2|123456789',
      provider: 'google',
      email: 'owner@example.com',
      name: 'Owner User',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    const mockUserRepository: IUserRepository = {
      findByExternalId: mock(() => Promise.resolve(mockUser)),
      findById: mock(() => Promise.resolve(mockUser)),
      findByEmail: mock(() => Promise.resolve(null)),
      findByIds: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve(mockUser)),
      update: mock(() => Promise.resolve(mockUser)),
      delete: mock(() => Promise.resolve()),
    };

    const { createViewerManagementRoutes } = await import(
      '../viewerManagementRoutes'
    );

    app = createViewerManagementRoutes({
      inviteViewerUseCase: useCases.inviteViewerUseCase,
      listProjectViewersUseCase: useCases.listProjectViewersUseCase,
      revokeViewerUseCase: useCases.revokeViewerUseCase,
      authMiddlewareOptions: {
        userRepository: mockUserRepository,
        mockPayload: {
          sub: mockUserId,
          email: 'owner@example.com',
        },
      },
    });
  });

  describe('POST /projects/{projectId}/viewers - viewer招待', () => {
    test('正常系: 新規メールアドレスへの招待が成功し201を返す', async () => {
      // Given: 新規招待が成功するモック
      const mockViewer = createMockProjectViewerEntity({
        projectId: mockProjectId,
        email: 'viewer@example.com',
      });
      useCases.inviteViewerUseCase.execute.mockResolvedValue(mockViewer);

      // When: POST /projects/{projectId}/viewersでviewer招待を送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: 201 Createdレスポンスと招待データを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('viewer@example.com');
      expect(data.data.status).toBe('active');
    });

    test('異常系: メール形式が不正な場合400を返す', async () => {
      // Given: 不正なメール形式でInvalidViewerDataErrorをスローするモック
      useCases.inviteViewerUseCase.execute.mockRejectedValue(
        new InvalidViewerDataError('メールアドレスの形式が正しくありません'),
      );

      // When: POST /projects/{projectId}/viewersで不正なメールを送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: 400 Bad Requestレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_VIEWER_DATA');
    });

    test('異常系: 自己招待の場合400を返す', async () => {
      // Given: 自己招待でInvalidViewerDataErrorをスローするモック
      useCases.inviteViewerUseCase.execute.mockRejectedValue(
        new InvalidViewerDataError('自分自身を招待できません'),
      );

      // When: POST /projects/{projectId}/viewersで自己招待を送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'owner@example.com' }),
      });

      // Then: 400 Bad Requestレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_VIEWER_DATA');
    });

    test('異常系: メール送信失敗時に502を返す', async () => {
      // Given: InvitationMailDeliveryErrorをスローするモック
      useCases.inviteViewerUseCase.execute.mockRejectedValue(
        new InvitationMailDeliveryError('招待メールの送信に失敗しました'),
      );

      // When: POST /projects/{projectId}/viewersで招待を送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: 502 Bad Gatewayレスポンスを返す
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.error.code).toBe('MAIL_DELIVERY_FAILED');
    });

    test('異常系: 他ユーザーのプロジェクトへの招待は404を返す', async () => {
      // Given: ProjectNotFoundErrorをスローするモック
      useCases.inviteViewerUseCase.execute.mockRejectedValue(
        ProjectNotFoundError.forProjectId(mockProjectId),
      );

      // When: POST /projects/{projectId}/viewersで招待を送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: 404 Not Foundレスポンスを返す
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('異常系: 認証トークンが無い場合401を返す', async () => {
      // When: Authorizationヘッダーなしでリクエストを送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: 401 Unauthorizedレスポンスを返す
      expect(res.status).toBe(401);
    });

    test('異常系: emailが未指定の場合バリデーションエラーで400を返す', async () => {
      // When: emailフィールドなしでリクエストを送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({}),
      });

      // Then: 400 Bad Requestレスポンスを返す
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('正常系: 別projectへの追加招待で既存トークンを維持したまま201を返す', async () => {
      // Given: 別projectへの追加招待が成功するモック（既存トークン維持、新規招待のみ）
      const mockViewer = createMockProjectViewerEntity({
        projectId: mockProjectId,
        email: 'viewer@example.com',
      });
      useCases.inviteViewerUseCase.execute.mockResolvedValue(mockViewer);

      // When: POST /projects/{projectId}/viewersで追加招待を送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: 201 Createdレスポンスと招待データを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('active');
    });

    test('正常系: 期限切れトークンへの再招待で新トークン発行を伴い201を返す', async () => {
      // Given: 期限切れトークンの再発行を伴う再招待が成功するモック
      const mockViewer = createMockProjectViewerEntity({
        projectId: mockProjectId,
        email: 'viewer@example.com',
      });
      useCases.inviteViewerUseCase.execute.mockResolvedValue(mockViewer);

      // When: POST /projects/{projectId}/viewersで再招待を送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: 201 Createdレスポンスと招待データを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('active');
    });

    test('正常系: 既にactive招待+有効トークンへの再招待はno-opとして201を返す', async () => {
      // Given: no-opとして既存の招待をそのまま返すモック
      const mockViewer = createMockProjectViewerEntity({
        projectId: mockProjectId,
        email: 'viewer@example.com',
      });
      useCases.inviteViewerUseCase.execute.mockResolvedValue(mockViewer);

      // When: POST /projects/{projectId}/viewersで重複招待を送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: エラーにならず201 Createdレスポンスを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('active');
    });

    test('正常系: 取り消し済みへの再招待で復元され201を返す', async () => {
      // Given: 復元された招待を返すモック
      const mockViewer = createMockProjectViewerEntity({
        projectId: mockProjectId,
        email: 'viewer@example.com',
      });
      useCases.inviteViewerUseCase.execute.mockResolvedValue(mockViewer);

      // When: POST /projects/{projectId}/viewersで再招待を送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ email: 'viewer@example.com' }),
      });

      // Then: 201 Createdレスポンスとactive状態の招待データを返す
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('active');
    });
  });

  describe('GET /projects/{projectId}/viewers - 招待済みviewer一覧', () => {
    test('正常系: 招待済みviewerの一覧を返す', async () => {
      // Given: 複数のactive招待を返すモック
      const viewers = [
        createMockProjectViewerEntity({
          projectId: mockProjectId,
          email: 'a@example.com',
        }),
        createMockProjectViewerEntity({
          projectId: mockProjectId,
          email: 'b@example.com',
        }),
      ];
      useCases.listProjectViewersUseCase.execute.mockResolvedValue(viewers);

      // When: GET /projects/{projectId}/viewersで一覧を取得
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'GET',
        headers: { Authorization: 'Bearer mock-token' },
      });

      // Then: 200レスポンスと一覧データを返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].email).toBe('a@example.com');
    });

    test('正常系: viewerが0件の場合は空配列を返す（境界値）', async () => {
      // Given: 空配列を返すモック
      useCases.listProjectViewersUseCase.execute.mockResolvedValue([]);

      // When: GET /projects/{projectId}/viewersで一覧を取得
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'GET',
        headers: { Authorization: 'Bearer mock-token' },
      });

      // Then: 200レスポンスと空配列を返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual([]);
    });

    test('異常系: 他ユーザーのプロジェクトへの一覧確認は404を返す', async () => {
      // Given: ProjectNotFoundErrorをスローするモック
      useCases.listProjectViewersUseCase.execute.mockRejectedValue(
        ProjectNotFoundError.forProjectId(mockProjectId),
      );

      // When: GET /projects/{projectId}/viewersで一覧を取得
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'GET',
        headers: { Authorization: 'Bearer mock-token' },
      });

      // Then: 404 Not Foundレスポンスを返す
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('異常系: 認証トークンが無い場合401を返す', async () => {
      // When: Authorizationヘッダーなしでリクエストを送信
      const res = await app.request(`/projects/${mockProjectId}/viewers`, {
        method: 'GET',
      });

      // Then: 401 Unauthorizedレスポンスを返す
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /projects/{projectId}/viewers/{viewerId} - viewer招待の取り消し', () => {
    const mockViewerId = '323e4567-e89b-12d3-a456-426614174002';

    test('正常系: 招待の取り消しが成功し204を返す', async () => {
      // Given: 取り消しが成功するモック
      useCases.revokeViewerUseCase.execute.mockResolvedValue(undefined);

      // When: DELETE /projects/{projectId}/viewers/{viewerId}で取り消しを送信
      const res = await app.request(
        `/projects/${mockProjectId}/viewers/${mockViewerId}`,
        {
          method: 'DELETE',
          headers: { Authorization: 'Bearer mock-token' },
        },
      );

      // Then: 204 No Contentレスポンスを返す
      expect(res.status).toBe(204);
    });

    test('異常系: 取り消し対象が存在しない場合404を返す', async () => {
      // Given: ViewerNotFoundErrorをスローするモック
      useCases.revokeViewerUseCase.execute.mockRejectedValue(
        ViewerNotFoundError.forViewerId(mockViewerId),
      );

      // When: DELETE /projects/{projectId}/viewers/{viewerId}で取り消しを送信
      const res = await app.request(
        `/projects/${mockProjectId}/viewers/${mockViewerId}`,
        {
          method: 'DELETE',
          headers: { Authorization: 'Bearer mock-token' },
        },
      );

      // Then: 404 Not Foundレスポンスを返す
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe('VIEWER_NOT_FOUND');
    });

    test('異常系: 他ユーザーのプロジェクトへの取り消しは404を返す', async () => {
      // Given: ProjectNotFoundErrorをスローするモック
      useCases.revokeViewerUseCase.execute.mockRejectedValue(
        ProjectNotFoundError.forProjectId(mockProjectId),
      );

      // When: DELETE /projects/{projectId}/viewers/{viewerId}で取り消しを送信
      const res = await app.request(
        `/projects/${mockProjectId}/viewers/${mockViewerId}`,
        {
          method: 'DELETE',
          headers: { Authorization: 'Bearer mock-token' },
        },
      );

      // Then: 404 Not Foundレスポンスを返す
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('異常系: 認証トークンが無い場合401を返す', async () => {
      // When: Authorizationヘッダーなしでリクエストを送信
      const res = await app.request(
        `/projects/${mockProjectId}/viewers/${mockViewerId}`,
        { method: 'DELETE' },
      );

      // Then: 401 Unauthorizedレスポンスを返す
      expect(res.status).toBe(401);
    });
  });
});
