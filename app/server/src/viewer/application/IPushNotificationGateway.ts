import type { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';

/**
 * Web Push通知の送信payload
 *
 * taskIdはService Worker側のnotificationclickハンドラが、生アクセストークンを
 * 含まないクリック時URL（/viewer/{token}?taskId={taskId}）を組み立てるために使う。
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  taskId: string;
}

/**
 * Push送信結果
 *
 * gone: 購読が無効化されている（410/404）。呼び出し元は該当購読を削除する
 * misconfigured: VAPID鍵の設定不備・署名不正など（401/403）。410/404のgoneとは異なり購読自体は有効
 * failed: 上記以外の失敗。REQ-302に基づき再送信・削除のいずれも行わない
 */
export type PushSendResult =
  | { outcome: 'sent' }
  | { outcome: 'gone' }
  | { outcome: 'misconfigured' }
  | { outcome: 'failed' };

/**
 * Web Push送信ゲートウェイインターフェース（Application層 port）
 *
 * DispatchTaskEventNotificationsUseCaseが依存するWeb Push送信操作の抽象化。
 * SesInvitationMailGatewayと同型のport/adapter分離。
 */
export interface IPushNotificationGateway {
  /**
   * 指定の購読へPush通知を送信する
   *
   * @param subscription - 送信先の購読
   * @param payload - 通知内容
   * @returns 送信結果（成功・購読無効化・その他失敗のいずれか）
   */
  send(
    subscription: PushSubscriptionEntity,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult>;
}
