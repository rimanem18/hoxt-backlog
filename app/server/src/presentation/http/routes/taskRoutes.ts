import { OpenAPIHono } from '@hono/zod-openapi';
import type { ChangeTaskStatusUseCase } from '@/application/usecases/ChangeTaskStatusUseCase';
import type { CreateTaskUseCase } from '@/application/usecases/CreateTaskUseCase';
import type { DeleteTaskUseCase } from '@/application/usecases/DeleteTaskUseCase';
import type { GetTaskByIdUseCase } from '@/application/usecases/GetTaskByIdUseCase';
import type { GetTasksUseCase } from '@/application/usecases/GetTasksUseCase';
import type { UpdateTaskUseCase } from '@/application/usecases/UpdateTaskUseCase';
import { InvalidTaskDataError, TaskNotFoundError } from '@/domain/task/errors';
import { TaskDIContainer } from '@/infrastructure/di/TaskDIContainer';
import {
  type AuthMiddlewareOptions,
  authMiddleware,
} from '@/presentation/http/middleware/auth/AuthMiddleware';
import { AuthError } from '@/presentation/http/middleware/errors/AuthError';
import { TaskController } from '../controllers/TaskController';
import {
  changeTaskStatusRoute,
  createTaskRoute,
  deleteTaskRoute,
  getTaskRoute,
  listTasksRoute,
  updateTaskRoute,
} from './taskRoutes.schema';

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
const tasks = new OpenAPIHono();

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
// Note: `as any`はOpenAPIHonoの型推論の制限により必要
tasks.openapi(createTaskRoute, (c) => taskController.create(c) as any);
tasks.openapi(listTasksRoute, (c) => taskController.getAll(c) as any);
tasks.openapi(getTaskRoute, (c) => taskController.getById(c) as any);
tasks.openapi(updateTaskRoute, (c) => taskController.update(c) as any);
tasks.openapi(deleteTaskRoute, (c) => taskController.delete(c) as any);
tasks.openapi(
  changeTaskStatusRoute,
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

  const app = new OpenAPIHono();

  // authMiddlewareでJWT認証を実施
  app.use('*', authMiddleware(dependencies.authMiddlewareOptions));

  // 6つのエンドポイントを登録
  // Note: `as any`はOpenAPIHonoの型推論の制限により必要
  app.openapi(createTaskRoute, (c) => controller.create(c) as any);
  app.openapi(listTasksRoute, (c) => controller.getAll(c) as any);
  app.openapi(getTaskRoute, (c) => controller.getById(c) as any);
  app.openapi(updateTaskRoute, (c) => controller.update(c) as any);
  app.openapi(deleteTaskRoute, (c) => controller.delete(c) as any);
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
