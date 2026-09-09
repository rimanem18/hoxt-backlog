import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { IRegisterPushSubscriptionUseCase } from '@/viewer/application/IRegisterPushSubscriptionUseCase';
import type { IUpdateNotificationSettingUseCase } from '@/viewer/application/IUpdateNotificationSettingUseCase';
import { ViewerNotFoundError } from '@/viewer/domain/errors';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import type { TokenHasher } from '@/viewer/infrastructure/TokenHasher';

describe('notificationRoutes統合テスト', () => {
  let app: OpenAPIHono;
  let updateNotificationSettingUseCase: {
    execute: ReturnType<typeof mock>;
  };
  let registerPushSubscriptionUseCase: {
    execute: ReturnType<typeof mock>;
  };
  let viewerAccessTokenRepository: IViewerAccessTokenRepository;
  let tokenHasher: TokenHasher;

  const testProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const tokenExpiresAt = new Date(Date.now() + 60_000);
  const validToken = ViewerAccessTokenEntity.reconstruct({
    id: 'token-id-1',
    email: 'viewer@example.com',
    tokenHash: 'hashed-valid-token',
    expiresAt: tokenExpiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    updateNotificationSettingUseCase = { execute: mock() };
    registerPushSubscriptionUseCase = { execute: mock() };
    viewerAccessTokenRepository = {
      findByEmail: mock(() => Promise.resolve(null)),
      findByTokenHash: mock((hash: string) =>
        Promise.resolve(hash === 'hashed-valid-token' ? validToken : null),
      ),
      save: mock(() => Promise.resolve(validToken)),
      deleteById: mock(() => Promise.resolve()),
      replace: mock(() => Promise.resolve(validToken)),
    };
    tokenHasher = {
      generate: mock(() => 'unused'),
      hash: mock((raw: string) =>
        raw === 'valid-raw-token' ? 'hashed-valid-token' : 'hashed-other',
      ),
    };

    const { createNotificationRoutes } = await import('../notificationRoutes');

    app = createNotificationRoutes({
      updateNotificationSettingUseCase:
        updateNotificationSettingUseCase as unknown as IUpdateNotificationSettingUseCase,
      registerPushSubscriptionUseCase:
        registerPushSubscriptionUseCase as unknown as IRegisterPushSubscriptionUseCase,
      viewerAccessTokenRepository,
      tokenHasher,
    });
  });

  describe('PATCH /viewer/projects/{projectId}/notification-setting', () => {
    test('正常系: 有効なトークンで通知設定を変更できる', async () => {
      // Given: 更新後のエンティティを返すモック
      const updated = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'viewer@example.com',
      });
      updated.disableNotification();
      updateNotificationSettingUseCase.execute.mockResolvedValue(updated);

      // When: 有効なトークンでPATCHリクエスト
      const res = await app.request(
        `/viewer/projects/${testProjectId}/notification-setting`,
        {
          method: 'PATCH',
          headers: {
            'Viewer-Access-Token': 'valid-raw-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled: false }),
        },
      );

      // Then: 200で更新後の設定を返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.projectId).toBe(testProjectId);
      expect(data.data.notificationEnabled).toBe(false);
      expect(updateNotificationSettingUseCase.execute).toHaveBeenCalledWith({
        viewerEmail: 'viewer@example.com',
        projectId: testProjectId,
        enabled: false,
      });
    });

    test('異常系: Viewer-Access-Tokenヘッダが無い場合401を返す', async () => {
      // When: ヘッダ無しでリクエスト
      const res = await app.request(
        `/viewer/projects/${testProjectId}/notification-setting`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: true }),
        },
      );

      // Then: 401
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 対象projectへのactive招待が存在しない場合404を返す', async () => {
      // Given: UseCaseがViewerNotFoundErrorをスローする
      updateNotificationSettingUseCase.execute.mockRejectedValue(
        new ViewerNotFoundError(testProjectId),
      );

      // When: 有効なトークンでPATCHリクエスト
      const res = await app.request(
        `/viewer/projects/${testProjectId}/notification-setting`,
        {
          method: 'PATCH',
          headers: {
            'Viewer-Access-Token': 'valid-raw-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled: true }),
        },
      );

      // Then: 404
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 他projectの設定には影響しない（対象projectIdのみでUseCaseが呼ばれる）', async () => {
      // Given: 更新後のエンティティを返すモック
      const otherProjectId = '650e8400-e29b-41d4-a716-446655440001';
      const updated = ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'viewer@example.com',
      });
      updateNotificationSettingUseCase.execute.mockResolvedValue(updated);

      // When: testProjectIdに対してPATCHリクエスト
      await app.request(
        `/viewer/projects/${testProjectId}/notification-setting`,
        {
          method: 'PATCH',
          headers: {
            'Viewer-Access-Token': 'valid-raw-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled: true }),
        },
      );

      // Then: 対象projectIdのみでUseCaseが呼ばれ、他projectでは呼ばれない
      expect(updateNotificationSettingUseCase.execute).toHaveBeenCalledWith({
        viewerEmail: 'viewer@example.com',
        projectId: testProjectId,
        enabled: true,
      });
      expect(updateNotificationSettingUseCase.execute).not.toHaveBeenCalledWith(
        expect.objectContaining({ projectId: otherProjectId }),
      );
    });
  });

  describe('POST /viewer/push-subscriptions', () => {
    test('正常系: 有効なトークンで購読を登録できる', async () => {
      // Given: 登録後のエンティティを返すモック
      const saved = PushSubscriptionEntity.create({
        email: 'viewer@example.com',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: 'p256dh-value',
        authKey: 'auth-value',
      });
      registerPushSubscriptionUseCase.execute.mockResolvedValue(saved);

      // When: 有効なトークンでPOSTリクエスト
      const res = await app.request('/viewer/push-subscriptions', {
        method: 'POST',
        headers: {
          'Viewer-Access-Token': 'valid-raw-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'https://push.example.com/subscription/abc',
          keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
        }),
      });

      // Then: 200で登録結果を返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('viewer@example.com');
      expect(data.data.endpoint).toBe(
        'https://push.example.com/subscription/abc',
      );
      expect(registerPushSubscriptionUseCase.execute).toHaveBeenCalledWith({
        email: 'viewer@example.com',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: 'p256dh-value',
        authKey: 'auth-value',
      });
    });

    test('異常系: Viewer-Access-Tokenヘッダが無い場合401を返す', async () => {
      // When: ヘッダ無しでリクエスト
      const res = await app.request('/viewer/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'https://push.example.com/subscription/abc',
          keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
        }),
      });

      // Then: 401
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: endpointが不正な形式の場合400を返す', async () => {
      // When: endpointがURL形式でないリクエスト
      const res = await app.request('/viewer/push-subscriptions', {
        method: 'POST',
        headers: {
          'Viewer-Access-Token': 'valid-raw-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'not-a-url',
          keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
        }),
      });

      // Then: 400
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(registerPushSubscriptionUseCase.execute).not.toHaveBeenCalled();
    });

    test('異常系: endpointがhttps以外のスキームの場合400を返す', async () => {
      // When: endpointがhttp URLのリクエスト
      const res = await app.request('/viewer/push-subscriptions', {
        method: 'POST',
        headers: {
          'Viewer-Access-Token': 'valid-raw-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'http://push.example.com/subscription/abc',
          keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
        }),
      });

      // Then: 400
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(registerPushSubscriptionUseCase.execute).not.toHaveBeenCalled();
    });

    test('異常系: keysが欠落している場合400を返す', async () => {
      // When: keysを含まないリクエスト
      const res = await app.request('/viewer/push-subscriptions', {
        method: 'POST',
        headers: {
          'Viewer-Access-Token': 'valid-raw-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'https://push.example.com/subscription/abc',
        }),
      });

      // Then: 400
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(registerPushSubscriptionUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
