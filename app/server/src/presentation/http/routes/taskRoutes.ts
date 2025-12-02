import { OpenAPIHono } from '@hono/zod-openapi';
import type { ChangeTaskStatusUseCase } from '@/application/usecases/ChangeTaskStatusUseCase';
import type { CreateTaskUseCase } from '@/application/usecases/CreateTaskUseCase';
import type { DeleteTaskUseCase } from '@/application/usecases/DeleteTaskUseCase';
import type { GetTaskByIdUseCase } from '@/application/usecases/GetTaskByIdUseCase';
import type { GetTasksUseCase } from '@/application/usecases/GetTasksUseCase';
import type { UpdateTaskUseCase } from '@/application/usecases/UpdateTaskUseCase';
import { InvalidTaskDataError, TaskNotFoundError } from '@/domain/task/errors';
import {
  type AuthMiddlewareOptions,
  authMiddleware,
} from '@/presentation/http/middleware/auth/AuthMiddleware';
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
 * taskRoutes依存性定義
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
 * taskRoutesファクトリー関数
 *
 * 6つのタスク管理エンドポイントを統合し、JWT認証とエラーハンドリングを適用した
 * OpenAPIHonoアプリケーションを返す。
 *
 * ミドルウェア構成:
 * - authMiddleware: JWT認証とRLS設定（全エンドポイント必須）
 * - app.onError(): グローバルエラーハンドラー（ドメインエラーをHTTPステータスに変換）
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

  // authMiddlewareで認証とRLS設定を実施
  app.use('*', authMiddleware(dependencies.authMiddlewareOptions));

  // 6つのエンドポイントを登録
  app.openapi(createTaskRoute, (c) => controller.create(c) as any);
  app.openapi(listTasksRoute, (c) => controller.getAll(c) as any);
  app.openapi(getTaskRoute, (c) => controller.getById(c) as any);
  app.openapi(updateTaskRoute, (c) => controller.update(c) as any);
  app.openapi(deleteTaskRoute, (c) => controller.delete(c) as any);
  app.openapi(changeTaskStatusRoute, (c) => controller.changeStatus(c) as any);

  // グローバルエラーハンドラー
  app.onError((err, c) => {
    console.error('Global error handler:', err);

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
