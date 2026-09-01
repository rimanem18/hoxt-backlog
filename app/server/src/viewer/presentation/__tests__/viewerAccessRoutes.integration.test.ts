import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { IGetViewerAccessibleProjectsUseCase } from '@/viewer/application/IGetViewerAccessibleProjectsUseCase';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import type { TokenHasher } from '@/viewer/infrastructure/TokenHasher';

describe('viewerAccessRoutes統合テスト', () => {
  let app: OpenAPIHono;
  let getViewerAccessibleProjectsUseCase: {
    execute: ReturnType<typeof mock>;
  };
  let viewerAccessTokenRepository: IViewerAccessTokenRepository;
  let tokenHasher: TokenHasher;

  const validToken = ViewerAccessTokenEntity.reconstruct({
    id: 'token-id-1',
    email: 'viewer@example.com',
    tokenHash: 'hashed-valid-token',
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    getViewerAccessibleProjectsUseCase = { execute: mock() };
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

    const { createViewerAccessRoutes } = await import('../viewerAccessRoutes');

    app = createViewerAccessRoutes({
      getViewerAccessibleProjectsUseCase:
        getViewerAccessibleProjectsUseCase as unknown as IGetViewerAccessibleProjectsUseCase,
      viewerAccessTokenRepository,
      tokenHasher,
    });
  });

  describe('GET /viewer/tasks - viewer横断閲覧', () => {
    test('正常系: 有効なトークンでプロジェクトごとにグルーピングされたtask一覧を返す', async () => {
      // Given: 複数projectのグルーピング結果を返すモック
      getViewerAccessibleProjectsUseCase.execute.mockResolvedValue([
        {
          projectId: 'project-1',
          projectName: 'プロジェクト1',
          ownerName: 'プロジェクト太郎',
          tasks: [
            {
              id: 'task-1',
              title: 'タスク1',
              description: '説明',
              status: 'not_started',
              priority: 'high',
            },
          ],
        },
      ]);

      // When: 有効なViewer-Access-Tokenでリクエスト
      const res = await app.request('/viewer/tasks', {
        headers: { 'Viewer-Access-Token': 'valid-raw-token' },
      });

      // Then: 200でグルーピングされたデータと閲覧者メール・オーナー名を返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.viewerEmail).toBe('viewer@example.com');
      expect(data.data.projects).toHaveLength(1);
      expect(data.data.projects[0].projectName).toBe('プロジェクト1');
      expect(data.data.projects[0].ownerName).toBe('プロジェクト太郎');
      expect(data.data.projects[0].tasks[0]).toMatchObject({
        title: 'タスク1',
        status: 'not_started',
        priority: 'high',
      });
      expect(getViewerAccessibleProjectsUseCase.execute).toHaveBeenCalledWith({
        viewerEmail: 'viewer@example.com',
      });
    });

    test('異常系: Viewer-Access-Tokenヘッダが無い場合401を返す', async () => {
      // When: ヘッダ無しでリクエスト
      const res = await app.request('/viewer/tasks');

      // Then: 401
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('異常系: 不正なトークンの場合401を返す', async () => {
      // When: 存在しないトークンでリクエスト
      const res = await app.request('/viewer/tasks', {
        headers: { 'Viewer-Access-Token': 'unknown-raw-token' },
      });

      // Then: 401
      expect(res.status).toBe(401);
    });

    test('正常系: 招待が0件の場合はエラーにせず空状態を返す', async () => {
      // Given: active招待0件の空配列を返すモック
      getViewerAccessibleProjectsUseCase.execute.mockResolvedValue([]);

      // When: 有効なトークンでリクエスト
      const res = await app.request('/viewer/tasks', {
        headers: { 'Viewer-Access-Token': 'valid-raw-token' },
      });

      // Then: 200で空配列を返す
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.projects).toEqual([]);
    });
  });
});
