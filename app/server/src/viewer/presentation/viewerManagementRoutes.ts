import { type Hook, OpenAPIHono } from '@hono/zod-openapi';
import { ProjectNotFoundError } from '@/project/domain/errors';
import { AuthError } from '@/shared/middleware/errors/AuthError';
import { formatZodError } from '@/shared/utils/zodErrorFormatter';
import {
  type AuthMiddlewareOptions,
  authMiddleware,
} from '@/user/presentation/middleware/auth/AuthMiddleware';
import type { IInviteViewerUseCase } from '@/viewer/application/IInviteViewerUseCase';
import type { IListProjectViewersUseCase } from '@/viewer/application/IListProjectViewersUseCase';
import type { IRevokeViewerUseCase } from '@/viewer/application/IRevokeViewerUseCase';
import {
  InvalidViewerDataError,
  InvitationMailDeliveryError,
  ViewerNotFoundError,
} from '@/viewer/domain/errors';
import { ViewerDIContainer } from '@/viewer/infrastructure/ViewerDIContainer';
import { ViewerManagementController } from './ViewerManagementController';
import {
  inviteViewerRoute,
  listProjectViewersRoute,
  revokeViewerRoute,
} from './viewerManagementRoutes.schema';

/**
 * リクエストボディのZodバリデーション失敗をハンドリングするフック
 *
 * inviteViewerSchemaのemail検証など、UseCase実行前のスキーマレベルの
 * 検証エラーも既存のprojectRoutesと同一形式（apiErrorResponseSchema）に揃える。
 */
// biome-ignore lint/suspicious/noExplicitAny: @hono/zod-openapiのHook型引数の制限
const validationHook: Hook<any, any, any, any> = (result, c) => {
  if (result.success) {
    return;
  }

  return c.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: formatZodError(result.error.issues),
      },
    },
    400,
  );
};

/**
 * viewerRoutes依存性定義（テスト用）
 *
 * viewer招待UseCaseと認証ミドルウェアオプションを注入する。
 * 依存性注入により、テスト時にモックを差し替え可能。
 */
export interface ViewerManagementRoutesDependencies {
  /** viewer招待ユースケース */
  inviteViewerUseCase: IInviteViewerUseCase;
  /** viewer一覧取得ユースケース */
  listProjectViewersUseCase: IListProjectViewersUseCase;
  /** viewer取り消しユースケース */
  revokeViewerUseCase: IRevokeViewerUseCase;
  /** 認証ミドルウェアオプション（テスト用mockPayloadを含む） */
  authMiddlewareOptions?: AuthMiddlewareOptions;
}

/**
 * viewerManagementRoutesファクトリー関数（テスト用）
 *
 * テスト時にモックUseCaseを注入するためのヘルパー関数。
 * 本番コードでは直接viewersインスタンスを使用する。
 *
 * @param dependencies - UseCaseとミドルウェアオプション
 * @returns 統合されたOpenAPIHonoアプリケーション
 */
export function createViewerManagementRoutes(
  dependencies: ViewerManagementRoutesDependencies,
): OpenAPIHono {
  const controller = new ViewerManagementController(
    dependencies.inviteViewerUseCase,
    dependencies.listProjectViewersUseCase,
    dependencies.revokeViewerUseCase,
  );

  const app = new OpenAPIHono({ defaultHook: validationHook });

  // authMiddlewareでJWT認証を実施
  app.use('*', authMiddleware(dependencies.authMiddlewareOptions));

  // エンドポイントを登録
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(inviteViewerRoute, (c) => controller.invite(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(listProjectViewersRoute, (c) => controller.list(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(revokeViewerRoute, (c) => controller.revoke(c) as any);

  // グローバルエラーハンドラー
  app.onError((err, c) => {
    console.error('Global error handler:', err);

    // 認証エラー → 401
    if (err instanceof AuthError) {
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

    if (err instanceof ProjectNotFoundError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        },
        404,
      );
    }

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

    if (err instanceof InvalidViewerDataError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_VIEWER_DATA',
            message: err.message,
          },
        },
        400,
      );
    }

    if (err instanceof InvitationMailDeliveryError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'MAIL_DELIVERY_FAILED',
            message: err.message,
          },
        },
        502,
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
 * Why: モジュールのimport時点でSES等の環境変数が未設定だと
 * ViewerDIContainer.getInviteViewerUseCase()が即時例外を投げ、
 * このファイルをimportするだけでサーバー全体の起動が失敗してしまう。
 * リクエストが実際に来るまでDI解決を遅延させ、影響範囲をviewer招待APIに限定する。
 */
const lazyInviteViewerUseCase: IInviteViewerUseCase = {
  execute: (input) => ViewerDIContainer.getInviteViewerUseCase().execute(input),
};

/**
 * 同上の遅延プロキシパターン（viewer一覧取得ユースケース）
 */
const lazyListProjectViewersUseCase: IListProjectViewersUseCase = {
  execute: (input) =>
    ViewerDIContainer.getListProjectViewersUseCase().execute(input),
};

/**
 * 同上の遅延プロキシパターン（viewer取り消しユースケース）
 */
const lazyRevokeViewerUseCase: IRevokeViewerUseCase = {
  execute: (input) => ViewerDIContainer.getRevokeViewerUseCase().execute(input),
};

/**
 * viewer管理APIのOpenAPIルート定義
 *
 * @hono/zod-openapiを使用したOpenAPI 3.1準拠の実装
 * ViewerDIContainerから依存性を注入し、viewer招待エンドポイントを提供
 *
 * @example
 * ```typescript
 * import viewers from './viewerManagementRoutes';
 * app.route('/api', viewers);
 * ```
 */
const viewers = createViewerManagementRoutes({
  inviteViewerUseCase: lazyInviteViewerUseCase,
  listProjectViewersUseCase: lazyListProjectViewersUseCase,
  revokeViewerUseCase: lazyRevokeViewerUseCase,
});

export default viewers;
