import type { Context } from 'hono';
import type { CreateProjectUseCase } from '@/project/application/CreateProjectUseCase';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';

/**
 * ProjectのDTO型定義
 */
interface ProjectDTO {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 成功レスポンス型（単一オブジェクト）
 */
interface SuccessResponseSingle {
  success: true;
  data: ProjectDTO;
}

/**
 * ProjectControllerクラス
 *
 * Presentation層のコントローラ。HTTPリクエストを受け取り、
 * 適切なユースケースを呼び出し、レスポンスを返す。
 * エラーハンドリングはerrorMiddlewareに委譲する。
 *
 * @example
 * ```typescript
 * const controller = new ProjectController(createProjectUseCase);
 * app.post('/api/projects', (c) => controller.create(c));
 * ```
 */
export class ProjectController {
  constructor(private readonly createProjectUseCase: CreateProjectUseCase) {}

  /**
   * プロジェクト作成エンドポイント
   *
   * POST /api/projects
   *
   * @param c - Honoコンテキスト
   * @returns 201レスポンス（作成されたプロジェクト）
   */
  async create(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const input = await c.req.json();

    const project = await this.createProjectUseCase.execute({
      userId,
      name: input.name,
      ...(input.description !== undefined && {
        description: input.description,
      }),
    });

    return c.json<SuccessResponseSingle>(
      {
        success: true,
        data: this.toDTO(project),
      },
      201,
    );
  }

  /**
   * ProjectEntityをDTOに変換
   *
   * @param project - ProjectEntityインスタンス
   * @returns ProjectDTO
   */
  private toDTO(project: ProjectEntity): ProjectDTO {
    return {
      id: project.getId(),
      userId: project.getUserId(),
      name: project.getName(),
      description: project.getDescription(),
      createdAt: project.getCreatedAt().toISOString(),
      updatedAt: project.getUpdatedAt().toISOString(),
    };
  }
}
