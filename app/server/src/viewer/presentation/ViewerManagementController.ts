import type { Context } from 'hono';
import type { IInviteViewerUseCase } from '@/viewer/application/IInviteViewerUseCase';
import type { IListProjectViewersUseCase } from '@/viewer/application/IListProjectViewersUseCase';
import type { IRevokeViewerUseCase } from '@/viewer/application/IRevokeViewerUseCase';
import type { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';

/**
 * ProjectViewerのDTO型定義
 */
interface ProjectViewerDTO {
  id: string;
  projectId: string;
  email: string;
  status: 'active' | 'revoked';
  invitedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 成功レスポンス型（単一オブジェクト）
 */
interface SuccessResponseSingle {
  success: true;
  data: ProjectViewerDTO;
}

/**
 * 成功レスポンス型（配列）
 */
interface SuccessResponseArray {
  success: true;
  data: ProjectViewerDTO[];
}

/**
 * ViewerManagementControllerクラス
 *
 * Presentation層のコントローラ。HTTPリクエストを受け取り、
 * viewer招待ユースケースを呼び出し、レスポンスを返す。
 * エラーハンドリングはerrorMiddlewareに委譲する。
 */
export class ViewerManagementController {
  constructor(
    private readonly inviteViewerUseCase: IInviteViewerUseCase,
    private readonly listProjectViewersUseCase: IListProjectViewersUseCase,
    private readonly revokeViewerUseCase: IRevokeViewerUseCase,
  ) {}

  /**
   * viewer招待エンドポイント
   *
   * POST /api/projects/:projectId/viewers
   *
   * @param c - Honoコンテキスト
   * @returns 201レスポンス（作成されたviewer招待）
   */
  async invite(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const projectId = c.req.param('projectId') as string;
    const input = await c.req.json();

    const viewer = await this.inviteViewerUseCase.execute({
      userId,
      projectId,
      email: input.email,
    });

    return c.json<SuccessResponseSingle>(
      {
        success: true,
        data: this.toDTO(viewer),
      },
      201,
    );
  }

  /**
   * viewer一覧取得エンドポイント
   *
   * GET /api/projects/:projectId/viewers
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（招待済みviewer一覧）
   */
  async list(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const projectId = c.req.param('projectId') as string;

    const viewers = await this.listProjectViewersUseCase.execute({
      userId,
      projectId,
    });

    return c.json<SuccessResponseArray>(
      { success: true, data: viewers.map((viewer) => this.toDTO(viewer)) },
      200,
    );
  }

  /**
   * viewer招待取り消しエンドポイント
   *
   * DELETE /api/projects/:projectId/viewers/:viewerId
   *
   * @param c - Honoコンテキスト
   * @returns 204レスポンス
   */
  async revoke(c: Context): Promise<Response> {
    const userId = c.get('userId') as string;
    const projectId = c.req.param('projectId') as string;
    const viewerId = c.req.param('viewerId') as string;

    await this.revokeViewerUseCase.execute({ userId, projectId, viewerId });

    return c.body(null, 204);
  }

  /**
   * ProjectViewerEntityをDTOに変換
   *
   * @param viewer - ProjectViewerEntityインスタンス
   * @returns ProjectViewerDTO
   */
  private toDTO(viewer: ProjectViewerEntity): ProjectViewerDTO {
    return {
      id: viewer.getId(),
      projectId: viewer.getProjectId(),
      email: viewer.getEmail(),
      status: viewer.getStatus(),
      invitedAt: viewer.getInvitedAt().toISOString(),
      revokedAt: viewer.getRevokedAt()?.toISOString() ?? null,
      createdAt: viewer.getCreatedAt().toISOString(),
      updatedAt: viewer.getUpdatedAt().toISOString(),
    };
  }
}
