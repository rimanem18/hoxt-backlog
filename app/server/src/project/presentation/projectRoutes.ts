import { type Hook, OpenAPIHono } from '@hono/zod-openapi';
import type { CreateProjectUseCase } from '@/project/application/CreateProjectUseCase';
import type { GetProjectByIdUseCase } from '@/project/application/GetProjectByIdUseCase';
import type { GetProjectsUseCase } from '@/project/application/GetProjectsUseCase';
import type { UpdateProjectUseCase } from '@/project/application/UpdateProjectUseCase';
import {
  InvalidProjectDataError,
  ProjectNotFoundError,
} from '@/project/domain/errors';
import { ProjectDIContainer } from '@/project/infrastructure/ProjectDIContainer';
import { AuthError } from '@/shared/middleware/errors/AuthError';
import { formatZodError } from '@/shared/utils/zodErrorFormatter';
import {
  type AuthMiddlewareOptions,
  authMiddleware,
} from '@/user/presentation/middleware/auth/AuthMiddleware';
import { ProjectController } from './ProjectController';
import {
  createProjectRoute,
  getProjectRoute,
  listProjectsRoute,
  updateProjectRoute,
} from './projectRoutes.schema';

/**
 * リクエストボディのZodバリデーション失敗をハンドリングするフック
 *
 * createProjectSchemaのtrim/min検証など、UseCase実行前のスキーマレベルの
 * 検証エラーも既存のauthRoutes/userRoutesと同一形式（apiErrorResponseSchema）に揃える。
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
 * プロジェクト管理APIのOpenAPIルート定義
 *
 * @hono/zod-openapiを使用したOpenAPI 3.1準拠の実装
 * ProjectDIContainerから依存性を注入し、プロジェクト作成エンドポイントを提供
 *
 * @example
 * ```typescript
 * import projects from './projectRoutes';
 * app.route('/api', projects);
 * ```
 */
const projects = new OpenAPIHono({ defaultHook: validationHook });

/**
 * ProjectControllerのインスタンス化
 *
 * ProjectDIContainerから依存性を注入してProjectControllerを生成。
 * モジュールスコープで1回だけインスタンス化（リクエストごとではない）。
 */
const projectController = new ProjectController(
  ProjectDIContainer.getCreateProjectUseCase(),
  ProjectDIContainer.getGetProjectsUseCase(),
  ProjectDIContainer.getGetProjectByIdUseCase(),
  ProjectDIContainer.getUpdateProjectUseCase(),
);

// authMiddlewareでJWT認証を実施
projects.use('*', authMiddleware());

// エンドポイントを登録
projects.openapi(
  createProjectRoute,
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  (c) => projectController.create(c) as any,
);
projects.openapi(
  listProjectsRoute,
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  (c) => projectController.getAll(c) as any,
);
projects.openapi(
  getProjectRoute,
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  (c) => projectController.getById(c) as any,
);
projects.openapi(
  updateProjectRoute,
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  (c) => projectController.update(c) as any,
);

// グローバルエラーハンドラー
projects.onError((err, c) => {
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

  if (err instanceof InvalidProjectDataError) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
        },
      },
      400,
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

/**
 * projectRoutes依存性定義（テスト用）
 *
 * プロジェクト作成UseCaseと認証ミドルウェアオプションを注入する。
 * 依存性注入により、テスト時にモックを差し替え可能。
 */
export interface ProjectRoutesDependencies {
  /** プロジェクト作成ユースケース */
  createProjectUseCase: CreateProjectUseCase;
  /** プロジェクト一覧取得ユースケース */
  getProjectsUseCase: GetProjectsUseCase;
  /** プロジェクト詳細取得ユースケース */
  getProjectByIdUseCase: GetProjectByIdUseCase;
  /** プロジェクト編集ユースケース */
  updateProjectUseCase: UpdateProjectUseCase;
  /** 認証ミドルウェアオプション（テスト用mockPayloadを含む） */
  authMiddlewareOptions?: AuthMiddlewareOptions;
}

/**
 * projectRoutesファクトリー関数（テスト用）
 *
 * テスト時にモックUseCaseを注入するためのヘルパー関数。
 * 本番コードでは直接projectsインスタンスを使用する。
 *
 * @param dependencies - UseCaseとミドルウェアオプション
 * @returns 統合されたOpenAPIHonoアプリケーション
 */
export function createProjectRoutes(
  dependencies: ProjectRoutesDependencies,
): OpenAPIHono {
  const controller = new ProjectController(
    dependencies.createProjectUseCase,
    dependencies.getProjectsUseCase,
    dependencies.getProjectByIdUseCase,
    dependencies.updateProjectUseCase,
  );

  const app = new OpenAPIHono({ defaultHook: validationHook });

  // authMiddlewareでJWT認証を実施
  app.use('*', authMiddleware(dependencies.authMiddlewareOptions));

  // エンドポイントを登録
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(createProjectRoute, (c) => controller.create(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(listProjectsRoute, (c) => controller.getAll(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(getProjectRoute, (c) => controller.getById(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(updateProjectRoute, (c) => controller.update(c) as any);

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

    if (err instanceof InvalidProjectDataError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: err.message,
          },
        },
        400,
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

export default projects;
