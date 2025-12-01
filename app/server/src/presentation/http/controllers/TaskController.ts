import type { Context } from 'hono';
import type { CreateTaskUseCase } from '@/application/usecases/CreateTaskUseCase';
import type { GetTaskByIdUseCase } from '@/application/usecases/GetTaskByIdUseCase';
import type { GetTasksUseCase } from '@/application/usecases/GetTasksUseCase';
import type { TaskEntity } from '@/domain/task/TaskEntity';

/**
 * TaskのDTO型定義
 */
interface TaskDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 成功レスポンス型（単一オブジェクト）
 */
interface SuccessResponseSingle {
  success: true;
  data: TaskDTO;
}

/**
 * 成功レスポンス型（配列）
 */
interface SuccessResponseArray {
  success: true;
  data: TaskDTO[];
}

/**
 * TaskControllerクラス
 *
 * Presentation層のコントローラ。HTTPリクエストを受け取り、
 * 適切なユースケースを呼び出し、レスポンスを返す。
 * エラーハンドリングはerrorMiddlewareに委譲する。
 *
 * @example
 * ```typescript
 * const controller = new TaskController(
 *   createTaskUseCase,
 *   getTasksUseCase,
 *   getTaskByIdUseCase,
 * );
 * app.post('/api/tasks', (c) => controller.create(c));
 * ```
 */
export class TaskController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly getTasksUseCase: GetTasksUseCase,
    private readonly getTaskByIdUseCase: GetTaskByIdUseCase,
  ) {}

  /**
   * タスク作成エンドポイント
   *
   * POST /api/tasks
   *
   * @param c - Honoコンテキスト
   * @returns 201レスポンス（作成されたタスク）
   */
  async create(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const input = await c.req.json();

    const task = await this.createTaskUseCase.execute({
      userId,
      title: input.title,
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.priority !== undefined && { priority: input.priority }),
    });

    return c.json<SuccessResponseSingle>(
      {
        success: true,
        data: this.toDTO(task),
      },
      201,
    );
  }

  /**
   * タスク一覧取得エンドポイント
   *
   * GET /api/tasks
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（タスク配列）
   */
  async getAll(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const query = c.req.query();

    // TaskSortByのバリデーション
    const sort = (query.sort || 'created_at_desc') as
      | 'created_at_desc'
      | 'created_at_asc'
      | 'priority_desc';

    const tasks = await this.getTasksUseCase.execute({
      userId,
      filters: {
        ...(query.priority && { priority: query.priority }),
        ...(query.status && {
          status: query.status.split(',').map((s) => s.trim()),
        }),
      },
      sort,
    });

    return c.json<SuccessResponseArray>(
      {
        success: true,
        data: tasks.map((task) => this.toDTO(task)),
      },
      200,
    );
  }

  /**
   * タスク詳細取得エンドポイント
   *
   * GET /api/tasks/:id
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（単一タスク）
   */
  async getById(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const taskId = c.req.param('id');

    const task = await this.getTaskByIdUseCase.execute({ userId, taskId });

    return c.json<SuccessResponseSingle>(
      {
        success: true,
        data: this.toDTO(task),
      },
      200,
    );
  }

  /**
   * TaskEntityをDTOに変換
   *
   * @param task - TaskEntityインスタンス
   * @returns TaskDTO
   */
  private toDTO(task: TaskEntity): TaskDTO {
    return {
      id: task.getId(),
      userId: task.getUserId(),
      title: task.getTitle(),
      description: task.getDescription(),
      priority: task.getPriority(),
      status: task.getStatus(),
      createdAt: task.getCreatedAt().toISOString(),
      updatedAt: task.getUpdatedAt().toISOString(),
    };
  }
}
