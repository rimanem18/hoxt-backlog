import type { Context } from 'hono';
import type { IInviteViewerUseCase } from '@/viewer/application/IInviteViewerUseCase';
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
 * ViewerManagementControllerクラス
 *
 * Presentation層のコントローラ。HTTPリクエストを受け取り、
 * viewer招待ユースケースを呼び出し、レスポンスを返す。
 * エラーハンドリングはerrorMiddlewareに委譲する。
 */
export class ViewerManagementController {
  constructor(private readonly inviteViewerUseCase: IInviteViewerUseCase) {}

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
