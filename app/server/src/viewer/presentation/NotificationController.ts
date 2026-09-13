import type { Context } from 'hono';
import type { IRegisterPushSubscriptionUseCase } from '@/viewer/application/IRegisterPushSubscriptionUseCase';
import type { IUpdateNotificationSettingUseCase } from '@/viewer/application/IUpdateNotificationSettingUseCase';

/**
 * 通知設定変更成功レスポンス型
 */
interface UpdateNotificationSettingSuccessResponse {
  success: true;
  data: {
    projectId: string;
    notificationEnabled: boolean;
  };
}

/**
 * Push購読登録成功レスポンス型
 */
interface RegisterPushSubscriptionSuccessResponse {
  success: true;
  data: {
    id: string;
    email: string;
    endpoint: string;
  };
}

/**
 * NotificationControllerクラス
 *
 * Presentation層のコントローラ。viewerTokenMiddlewareが検証した
 * viewerEmailを使い、通知設定変更・Push購読登録ユースケースを呼び出しレスポンスを返す。
 */
export class NotificationController {
  constructor(
    private readonly updateNotificationSettingUseCase: IUpdateNotificationSettingUseCase,
    private readonly registerPushSubscriptionUseCase: IRegisterPushSubscriptionUseCase,
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

    return c.json<UpdateNotificationSettingSuccessResponse>(
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

  /**
   * Push購読登録エンドポイント
   *
   * POST /api/viewer/push-subscriptions
   *
   * @param c - Honoコンテキスト
   * @returns 200レスポンス（登録された購読情報）
   */
  async registerPushSubscription(c: Context): Promise<Response> {
    const viewerEmail = c.get('viewerEmail');
    const { endpoint, keys } = await c.req.json();

    const entity = await this.registerPushSubscriptionUseCase.execute({
      email: viewerEmail,
      endpoint,
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
    });

    return c.json<RegisterPushSubscriptionSuccessResponse>(
      {
        success: true,
        data: {
          id: entity.getId(),
          email: entity.getEmail(),
          endpoint: entity.getEndpoint(),
        },
      },
      200,
    );
  }
}
