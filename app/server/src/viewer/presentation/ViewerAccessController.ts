import type { Context } from 'hono';
import type {
  IGetViewerAccessibleProjectsUseCase,
  ViewerAccessibleProjectDTO,
} from '@/viewer/application/IGetViewerAccessibleProjectsUseCase';

/**
 * 成功レスポンス型
 */
interface SuccessResponse {
  success: true;
  data: {
    viewerEmail: string;
    projects: ViewerAccessibleProjectDTO[];
  };
}

/**
 * ViewerAccessControllerクラス
 *
 * Presentation層のコントローラ。viewerTokenMiddlewareが検証した
 * viewerEmailを使い、横断閲覧ユースケースを呼び出しレスポンスを返す。
 */
export class ViewerAccessController {
  constructor(
    private readonly getViewerAccessibleProjectsUseCase: IGetViewerAccessibleProjectsUseCase,
  ) {}

  /**
   * viewer横断閲覧エンドポイント
   *
   * GET /api/viewer/tasks
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（projectごとにグルーピングされたtask一覧）
   */
  async getTasks(c: Context): Promise<Response> {
    const viewerEmail = c.get('viewerEmail');

    const projects = await this.getViewerAccessibleProjectsUseCase.execute({
      viewerEmail,
    });

    return c.json<SuccessResponse>(
      { success: true, data: { viewerEmail, projects } },
      200,
    );
  }
}
