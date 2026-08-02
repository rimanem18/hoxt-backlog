import { type Hook, OpenAPIHono } from '@hono/zod-openapi';
import { ProjectNotFoundError } from '@/project/domain/errors';
import { AuthError } from '@/shared/middleware/errors/AuthError';
import { formatZodError } from '@/shared/utils/zodErrorFormatter';
import type { ChangeTaskStatusUseCase } from '@/task/application/ChangeTaskStatusUseCase';
import type { CreateTaskUseCase } from '@/task/application/CreateTaskUseCase';
import type { DeleteTaskUseCase } from '@/task/application/DeleteTaskUseCase';
import type { GetTaskByIdUseCase } from '@/task/application/GetTaskByIdUseCase';
import type { GetTasksUseCase } from '@/task/application/GetTasksUseCase';
import type { UpdateTaskUseCase } from '@/task/application/UpdateTaskUseCase';
import { InvalidTaskDataError, TaskNotFoundError } from '@/task/domain/errors';
import { TaskDIContainer } from '@/task/infrastructure/TaskDIContainer';
import {
  type AuthMiddlewareOptions,
  authMiddleware,
} from '@/user/presentation/middleware/auth/AuthMiddleware';
import { TaskController } from './TaskController';
import {
  changeTaskStatusRoute,
  createTaskRoute,
  deleteTaskRoute,
  getTaskRoute,
  listTasksRoute,
  updateTaskRoute,
} from './taskRoutes.schema';

/**
 * リクエストボディのZodバリデーション失敗をハンドリングするフック
 *
 * createTaskBodySchemaのprojectId必須検証など、UseCase実行前のスキーマレベルの
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
 * タスク管理APIのOpenAPIルート定義
 *
 * @hono/zod-openapiを使用したOpenAPI 3.1準拠の実装
 * TaskDIContainerから依存性を注入し、6つのタスク管理エンドポイントを提供
 *
 * @example
 * ```typescript
 * import task from './taskRoutes';
 * app.route('/api', task);
 * ```
 */
const tasks = new OpenAPIHono({ defaultHook: validationHook });

/**
 * TaskControllerのインスタンス化
 *
 * TaskDIContainerから依存性を注入してTaskControllerを生成。
 * モジュールスコープで1回だけインスタンス化（リクエストごとではない）。
 */
const taskController = new TaskController(
  TaskDIContainer.getCreateTaskUseCase(),
  TaskDIContainer.getGetTasksUseCase(),
  TaskDIContainer.getGetTaskByIdUseCase(),
  TaskDIContainer.getUpdateTaskUseCase(),
  TaskDIContainer.getDeleteTaskUseCase(),
  TaskDIContainer.getChangeTaskStatusUseCase(),
);

// authMiddlewareでJWT認証を実施
tasks.use('*', authMiddleware());

// 6つのエンドポイントを登録
// biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
tasks.openapi(createTaskRoute, (c) => taskController.create(c) as any);
// biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
tasks.openapi(listTasksRoute, (c) => taskController.getAll(c) as any);
// biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
tasks.openapi(getTaskRoute, (c) => taskController.getById(c) as any);
// biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
tasks.openapi(updateTaskRoute, (c) => taskController.update(c) as any);
// biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
tasks.openapi(deleteTaskRoute, (c) => taskController.delete(c) as any);
tasks.openapi(
  changeTaskStatusRoute,
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  (c) => taskController.changeStatus(c) as any,
);

// グローバルエラーハンドラー
tasks.onError((err, c) => {
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

  if (err instanceof TaskNotFoundError) {
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

  if (err instanceof InvalidTaskDataError) {
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
 * taskRoutes依存性定義（テスト用）
 *
 * 6つのタスク管理UseCaseと認証ミドルウェアオプションを注入する。
 * 依存性注入により、テスト時にモックを差し替え可能。
 */
export interface TaskRoutesDependencies {
  /** タスク作成ユースケース */
  createTaskUseCase: CreateTaskUseCase;
  /** タスク一覧取得ユースケース */
  getTasksUseCase: GetTasksUseCase;
  /** タスク詳細取得ユースケース */
  getTaskByIdUseCase: GetTaskByIdUseCase;
  /** タスク更新ユースケース */
  updateTaskUseCase: UpdateTaskUseCase;
  /** タスク削除ユースケース */
  deleteTaskUseCase: DeleteTaskUseCase;
  /** タスクステータス変更ユースケース */
  changeTaskStatusUseCase: ChangeTaskStatusUseCase;
  /** 認証ミドルウェアオプション（テスト用mockPayloadを含む） */
  authMiddlewareOptions?: AuthMiddlewareOptions;
}

/**
 * taskRoutesファクトリー関数（テスト用）
 *
 * テスト時にモックUseCaseを注入するためのヘルパー関数。
 * 本番コードでは直接tasksインスタンスを使用する。
 *
 * @param dependencies - UseCaseとミドルウェアオプション
 * @returns 統合されたOpenAPIHonoアプリケーション
 */
export function createTaskRoutes(
  dependencies: TaskRoutesDependencies,
): OpenAPIHono {
  const controller = new TaskController(
    dependencies.createTaskUseCase,
    dependencies.getTasksUseCase,
    dependencies.getTaskByIdUseCase,
    dependencies.updateTaskUseCase,
    dependencies.deleteTaskUseCase,
    dependencies.changeTaskStatusUseCase,
  );

  const app = new OpenAPIHono({ defaultHook: validationHook });

  // authMiddlewareでJWT認証を実施
  app.use('*', authMiddleware(dependencies.authMiddlewareOptions));

  // 6つのエンドポイントを登録
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(createTaskRoute, (c) => controller.create(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(listTasksRoute, (c) => controller.getAll(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(getTaskRoute, (c) => controller.getById(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(updateTaskRoute, (c) => controller.update(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(deleteTaskRoute, (c) => controller.delete(c) as any);
  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
  app.openapi(changeTaskStatusRoute, (c) => controller.changeStatus(c) as any);

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

    if (err instanceof TaskNotFoundError) {
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

    if (err instanceof InvalidTaskDataError) {
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

export default tasks;
