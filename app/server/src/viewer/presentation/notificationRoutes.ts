import { OpenAPIHono } from '@hono/zod-openapi';
import type { IUpdateNotificationSettingUseCase } from '@/viewer/application/IUpdateNotificationSettingUseCase';
import {
  InvalidViewerAccessTokenError,
  ViewerNotFoundError,
} from '@/viewer/domain/errors';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import type { TokenHasher } from '@/viewer/infrastructure/TokenHasher';
import { ViewerDIContainer } from '@/viewer/infrastructure/ViewerDIContainer';
import { viewerTokenMiddleware } from './middleware/viewerTokenMiddleware';
import { NotificationController } from './NotificationController';
import { updateNotificationSettingRoute } from './notificationRoutes.schema';

/**
 * notificationRoutes依存性定義（テスト用）
 *
 * 通知設定変更UseCaseとviewerトークン検証に必要な依存を注入する。
 * 依存性注入により、テスト時にモックを差し替え可能。
 */
export interface NotificationRoutesDependencies {
  /** 通知設定変更ユースケース */
  updateNotificationSettingUseCase: IUpdateNotificationSettingUseCase;
  /** viewerアクセストークンリポジトリ（viewerTokenMiddleware用） */
  viewerAccessTokenRepository: IViewerAccessTokenRepository;
  /** トークンハッシュ化ユーティリティ（viewerTokenMiddleware用） */
  tokenHasher: TokenHasher;
}

/**
 * notificationRoutesファクトリー関数（テスト用）
 *
 * テスト時にモックUseCase・リポジトリを注入するためのヘルパー関数。
 * 本番コードでは直接notificationインスタンスを使用する。
 *
 * @param dependencies - UseCaseとリポジトリ・ハッシュ化ユーティリティ
 * @returns 統合されたOpenAPIHonoアプリケーション
 */
export function createNotificationRoutes(
  dependencies: NotificationRoutesDependencies,
): OpenAPIHono {
  const controller = new NotificationController(
    dependencies.updateNotificationSettingUseCase,
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
    '/viewer/projects/*/notification-setting',
    viewerTokenMiddleware({
      viewerAccessTokenRepository: dependencies.viewerAccessTokenRepository,
      tokenHasher: dependencies.tokenHasher,
    }),
  );

  // エンドポイントを登録
  app.openapi(
    updateNotificationSettingRoute,
    (c) =>
      // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
      controller.updateNotificationSetting(c) as any,
  );

  // グローバルエラーハンドラー
  app.onError((err, c) => {
    console.error('Global error handler:', err);

    if (err instanceof ViewerNotFoundError) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        404,
      );
    }

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
 * リクエストが実際に来るまでDI解決を遅延させ、影響範囲をviewer通知設定APIに限定する。
 */
const lazyUpdateNotificationSettingUseCase: IUpdateNotificationSettingUseCase =
  {
    execute: (input) =>
      ViewerDIContainer.getUpdateNotificationSettingUseCase().execute(input),
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
 * viewer通知設定変更APIのOpenAPIルート定義
 *
 * @hono/zod-openapiを使用したOpenAPI 3.1準拠の実装
 * ViewerDIContainerから依存性を注入し、通知設定変更エンドポイントを提供
 *
 * @example
 * ```typescript
 * import notification from './notificationRoutes';
 * app.route('/api', notification);
 * ```
 */
const notification = createNotificationRoutes({
  updateNotificationSettingUseCase: lazyUpdateNotificationSettingUseCase,
  viewerAccessTokenRepository: lazyViewerAccessTokenRepository,
  tokenHasher: ViewerDIContainer.getTokenHasher(),
});

export default notification;
