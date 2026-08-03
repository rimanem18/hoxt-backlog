import type { Context } from 'hono';
import type { ICreateProjectUseCase } from '@/project/application/ICreateProjectUseCase';
import type { IGetProjectByIdUseCase } from '@/project/application/IGetProjectByIdUseCase';
import type { IGetProjectsUseCase } from '@/project/application/IGetProjectsUseCase';
import type { IUpdateProjectUseCase } from '@/project/application/IUpdateProjectUseCase';
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
 * 成功レスポンス型（配列）
 */
interface SuccessResponseArray {
  success: true;
  data: ProjectDTO[];
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
 * const controller = new ProjectController(
 *   createProjectUseCase,
 *   getProjectsUseCase,
 *   getProjectByIdUseCase,
 *   updateProjectUseCase,
 * );
 * app.post('/api/projects', (c) => controller.create(c));
 * ```
 */
export class ProjectController {
  constructor(
    private readonly createProjectUseCase: ICreateProjectUseCase,
    private readonly getProjectsUseCase: IGetProjectsUseCase,
    private readonly getProjectByIdUseCase: IGetProjectByIdUseCase,
    private readonly updateProjectUseCase: IUpdateProjectUseCase,
  ) {}

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
   * プロジェクト一覧取得エンドポイント
   *
   * GET /api/projects
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（プロジェクト配列）
   */
  async getAll(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;

    const projects = await this.getProjectsUseCase.execute({ userId });

    return c.json<SuccessResponseArray>(
      {
        success: true,
        data: projects.map((project) => this.toDTO(project)),
      },
      200,
    );
  }

  /**
   * プロジェクト詳細取得エンドポイント
   *
   * GET /api/projects/:id
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（単一プロジェクト）
   */
  async getById(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const projectId = c.req.param('id') as string;

    const project = await this.getProjectByIdUseCase.execute({
      userId,
      projectId,
    });

    return c.json<SuccessResponseSingle>(
      {
        success: true,
        data: this.toDTO(project),
      },
      200,
    );
  }

  /**
   * プロジェクト編集エンドポイント
   *
   * PUT /api/projects/:id
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（更新後のプロジェクト）
   */
  async update(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const id = c.req.param('id') as string;
    const input = await c.req.json();

    const project = await this.updateProjectUseCase.execute({
      userId,
      projectId: id,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
    });

    return c.json<SuccessResponseSingle>(
      {
        success: true,
        data: this.toDTO(project),
      },
      200,
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
