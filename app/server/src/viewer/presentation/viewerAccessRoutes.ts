import { OpenAPIHono } from '@hono/zod-openapi';
import type { IGetViewerAccessibleProjectsUseCase } from '@/viewer/application/IGetViewerAccessibleProjectsUseCase';
import { InvalidViewerAccessTokenError } from '@/viewer/domain/errors';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import type { TokenHasher } from '@/viewer/infrastructure/TokenHasher';
import { ViewerDIContainer } from '@/viewer/infrastructure/ViewerDIContainer';
import { viewerTokenMiddleware } from './middleware/viewerTokenMiddleware';
import { ViewerAccessController } from './ViewerAccessController';
import { getViewerTasksRoute } from './viewerAccessRoutes.schema';

/**
 * viewerAccessRoutes依存性定義（テスト用）
 *
 * viewer横断閲覧UseCaseとviewerトークン検証に必要な依存を注入する。
 * 依存性注入により、テスト時にモックを差し替え可能。
 */
export interface ViewerAccessRoutesDependencies {
  /** viewer横断閲覧ユースケース */
  getViewerAccessibleProjectsUseCase: IGetViewerAccessibleProjectsUseCase;
  /** viewerアクセストークンリポジトリ（viewerTokenMiddleware用） */
  viewerAccessTokenRepository: IViewerAccessTokenRepository;
  /** トークンハッシュ化ユーティリティ（viewerTokenMiddleware用） */
  tokenHasher: TokenHasher;
}

/**
 * viewerAccessRoutesファクトリー関数（テスト用）
 *
 * テスト時にモックUseCase・リポジトリを注入するためのヘルパー関数。
 * 本番コードでは直接viewerAccessインスタンスを使用する。
 *
 * @param dependencies - UseCaseとリポジトリ・ハッシュ化ユーティリティ
 * @returns 統合されたOpenAPIHonoアプリケーション
 */
export function createViewerAccessRoutes(
  dependencies: ViewerAccessRoutesDependencies,
): OpenAPIHono {
  const controller = new ViewerAccessController(
    dependencies.getViewerAccessibleProjectsUseCase,
  );

  const app = new OpenAPIHono();

  // viewerTokenMiddlewareでViewer-Access-Token認証を実施
  // Why: '*'ではなく個別パスに限定する。app.route()でこのルーターが
  // '/api'配下にマウントされる際、'*'指定だと合成後の親ルーターで
  // '/api/*'という広いパターンとして登録され、他ドメイン（task/project等）の
  // 未マッチパス（本来404になるべきリクエスト）まで誤って本ミドルウェアが
  // 横取りしてしまうため。既存authMiddleware配下のルーターとは完全に
  // 独立した認証経路として実装する
  app.use(
    '/viewer/tasks',
    viewerTokenMiddleware({
      viewerAccessTokenRepository: dependencies.viewerAccessTokenRepository,
      tokenHasher: dependencies.tokenHasher,
    }),
  );

  // エンドポイントを登録
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(getViewerTasksRoute, (c) => controller.getTasks(c) as any);

  // グローバルエラーハンドラー
  app.onError((err, c) => {
    console.error('Global error handler:', err);

    if (err instanceof InvalidViewerAccessTokenError) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        401,
      );
    }

    // その他のエラー → 500
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      },
      500,
    );
  });

  return app;
}

/**
 * ViewerDIContainerへの解決を実際のリクエスト処理時まで遅延させるプロキシ
 *
 * Why: モジュールのimport時点でDIコンテナがDB接続等を要求すると、
 * このファイルをimportするだけでサーバー全体の起動が失敗してしまう。
 * リクエストが実際に来るまでDI解決を遅延させ、影響範囲をviewer閲覧APIに限定する。
 */
const lazyGetViewerAccessibleProjectsUseCase: IGetViewerAccessibleProjectsUseCase =
  {
    execute: (input) =>
      ViewerDIContainer.getGetViewerAccessibleProjectsUseCase().execute(input),
  };

const lazyViewerAccessTokenRepository: IViewerAccessTokenRepository = {
  findByEmail: (email) =>
    ViewerDIContainer.getViewerAccessTokenRepository().findByEmail(email),
  findByTokenHash: (tokenHash) =>
    ViewerDIContainer.getViewerAccessTokenRepository().findByTokenHash(
      tokenHash,
    ),
  save: (entity) =>
    ViewerDIContainer.getViewerAccessTokenRepository().save(entity),
  deleteById: (id) =>
    ViewerDIContainer.getViewerAccessTokenRepository().deleteById(id),
  replace: (existingId, newTokenHash, newExpiresAt) =>
    ViewerDIContainer.getViewerAccessTokenRepository().replace(
      existingId,
      newTokenHash,
      newExpiresAt,
    ),
};

/**
 * viewer横断閲覧APIのOpenAPIルート定義
 *
 * @hono/zod-openapiを使用したOpenAPI 3.1準拠の実装
 * ViewerDIContainerから依存性を注入し、viewer横断閲覧エンドポイントを提供
 *
 * @example
 * ```typescript
 * import viewerAccess from './viewerAccessRoutes';
 * app.route('/api', viewerAccess);
 * ```
 */
const viewerAccess = createViewerAccessRoutes({
  getViewerAccessibleProjectsUseCase: lazyGetViewerAccessibleProjectsUseCase,
  viewerAccessTokenRepository: lazyViewerAccessTokenRepository,
  tokenHasher: ViewerDIContainer.getTokenHasher(),
});

export default viewerAccess;
