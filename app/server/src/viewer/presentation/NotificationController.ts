import type { Context } from 'hono';
import type { IUpdateNotificationSettingUseCase } from '@/viewer/application/IUpdateNotificationSettingUseCase';

/**
 * 成功レスポンス型
 */
interface SuccessResponse {
  success: true;
  data: {
    projectId: string;
    notificationEnabled: boolean;
  };
}

/**
 * NotificationControllerクラス
 *
 * Presentation層のコントローラ。viewerTokenMiddlewareが検証した
 * viewerEmailを使い、通知設定変更ユースケースを呼び出しレスポンスを返す。
 */
export class NotificationController {
  constructor(
    private readonly updateNotificationSettingUseCase: IUpdateNotificationSettingUseCase,
  ) {}

  /**
   * viewer通知設定変更エンドポイント
   *
   * PATCH /api/viewer/projects/{projectId}/notification-setting
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（変更後の通知設定）
   */
  async updateNotificationSetting(c: Context): Promise<Response> {
    const viewerEmail = c.get('viewerEmail');
    const projectId = c.req.param('projectId') as string;
    const { enabled } = await c.req.json();

    const entity = await this.updateNotificationSettingUseCase.execute({
      viewerEmail,
      projectId,
      enabled,
    });

    return c.json<SuccessResponse>(
      {
        success: true,
        data: {
          projectId: entity.getProjectId(),
          notificationEnabled: entity.isNotificationEnabled(),
        },
      },
      200,
    );
  }
}
