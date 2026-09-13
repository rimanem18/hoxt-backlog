import webpush from 'web-push';
import { getVapidKeys } from '@/shared/config/env';
import type {
  IPushNotificationGateway,
  PushNotificationPayload,
  PushSendResult,
} from '@/viewer/application/IPushNotificationGateway';
import type { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';

/**
 * web-pushの`sendNotification`と同形の送信関数
 */
type SendNotificationFn = typeof webpush.sendNotification;

/**
 * web-pushを使ったPush通知送信の実装
 *
 * 購読無効化（410/404）のみ呼び出し元へ`gone`として通知し、
 * それ以外の失敗はfail-openで`failed`として扱う（REQ-302: 再送信・削除は行わない）。
 */
export class WebPushGateway implements IPushNotificationGateway {
  private static instance: WebPushGateway | null = null;

  private constructor(
    private readonly sendNotificationFn: SendNotificationFn,
  ) {}

  static getInstance(): WebPushGateway {
    if (!WebPushGateway.instance) {
      const { subject, publicKey, privateKey } = getVapidKeys();
      webpush.setVapidDetails(subject, publicKey, privateKey);

      WebPushGateway.instance = new WebPushGateway(webpush.sendNotification);
    }

    return WebPushGateway.instance;
  }

  /**
   * テスト用: 注入済みsendNotification関数からインスタンスを生成する
   *
   * fail-fast のため NODE_ENV=test 以外での呼び出しは例外を投げる。
   */
  static createForTesting(
    sendNotificationFn: SendNotificationFn,
  ): WebPushGateway {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('createForTesting is only available in test environment');
    }

    return new WebPushGateway(sendNotificationFn);
  }

  async send(
    subscription: PushSubscriptionEntity,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult> {
    const webPushSubscription = {
      endpoint: subscription.getEndpoint(),
      keys: {
        p256dh: subscription.getP256dhKey(),
        auth: subscription.getAuthKey(),
      },
    };

    try {
      await this.sendNotificationFn(
        webPushSubscription,
        JSON.stringify(payload),
      );

      return { outcome: 'sent' };
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;

      if (statusCode === 410 || statusCode === 404) {
        return { outcome: 'gone' };
      }

      console.error('Web Push通知の送信に失敗しました', err);

      return { outcome: 'failed' };
    }
  }
}
