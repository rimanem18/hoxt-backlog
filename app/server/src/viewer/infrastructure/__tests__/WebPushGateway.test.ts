import { describe, expect, mock, test } from 'bun:test';
import type webpush from 'web-push';
import { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';
import { WebPushGateway } from '../WebPushGateway';

const testSendResult: webpush.SendResult = {
  statusCode: 201,
  body: '',
  headers: {},
};

const testSubscription = PushSubscriptionEntity.create({
  email: 'viewer@example.com',
  endpoint: 'https://push.example.com/endpoint-1',
  p256dhKey: 'p256dh-key',
  authKey: 'auth-key',
});

const testPayload = {
  title: 'テストproject',
  body: '「テストtask」が追加されました',
  taskId: 'task-1',
};

function createMockSendNotificationFn(
  impl: () => Promise<webpush.SendResult>,
): typeof webpush.sendNotification {
  return mock(impl);
}

describe('WebPushGateway', () => {
  test('送信が成功した場合、sentを返す', async () => {
    // Given: 常に成功するsendNotification関数
    const sendNotificationFn = createMockSendNotificationFn(() =>
      Promise.resolve(testSendResult),
    );
    const gateway = WebPushGateway.createForTesting(sendNotificationFn);

    // When: Push通知を送信
    const result = await gateway.send(testSubscription, testPayload);

    // Then: 送信成功を示す結果が返る
    expect(result).toEqual({ outcome: 'sent' });
    expect(sendNotificationFn).toHaveBeenCalledTimes(1);
  });

  test('410エラー（購読無効化）の場合、goneを返す', async () => {
    // Given: 410エラーを返すsendNotification関数
    const error = Object.assign(new Error('Gone'), { statusCode: 410 });
    const sendNotificationFn = createMockSendNotificationFn(() =>
      Promise.reject(error),
    );
    const gateway = WebPushGateway.createForTesting(sendNotificationFn);

    // When: Push通知を送信
    const result = await gateway.send(testSubscription, testPayload);

    // Then: 購読無効化を示す結果が返る
    expect(result).toEqual({ outcome: 'gone' });
  });

  test('404エラー（購読無効化）の場合、goneを返す', async () => {
    // Given: 404エラーを返すsendNotification関数
    const error = Object.assign(new Error('Not Found'), { statusCode: 404 });
    const sendNotificationFn = createMockSendNotificationFn(() =>
      Promise.reject(error),
    );
    const gateway = WebPushGateway.createForTesting(sendNotificationFn);

    // When: Push通知を送信
    const result = await gateway.send(testSubscription, testPayload);

    // Then: 購読無効化を示す結果が返る
    expect(result).toEqual({ outcome: 'gone' });
  });

  test('403エラー（VAPID鍵の設定不備）の場合、misconfiguredを返す', async () => {
    // Given: 403エラーを返すsendNotification関数
    const error = Object.assign(new Error('Forbidden'), { statusCode: 403 });
    const sendNotificationFn = createMockSendNotificationFn(() =>
      Promise.reject(error),
    );
    const gateway = WebPushGateway.createForTesting(sendNotificationFn);

    // When: Push通知を送信
    const result = await gateway.send(testSubscription, testPayload);

    // Then: 設定不備を示す結果が返る（一時的な送信失敗と区別する）
    expect(result).toEqual({ outcome: 'misconfigured' });
  });

  test('401エラー（VAPID鍵の設定不備）の場合、misconfiguredを返す', async () => {
    // Given: 401エラーを返すsendNotification関数
    const error = Object.assign(new Error('Unauthorized'), {
      statusCode: 401,
    });
    const sendNotificationFn = createMockSendNotificationFn(() =>
      Promise.reject(error),
    );
    const gateway = WebPushGateway.createForTesting(sendNotificationFn);

    // When: Push通知を送信
    const result = await gateway.send(testSubscription, testPayload);

    // Then: 設定不備を示す結果が返る（一時的な送信失敗と区別する）
    expect(result).toEqual({ outcome: 'misconfigured' });
  });

  test('410/404以外のエラーの場合、failedを返す（再送信・削除はしない）', async () => {
    // Given: 500エラーを返すsendNotification関数
    const error = Object.assign(new Error('Server Error'), { statusCode: 500 });
    const sendNotificationFn = createMockSendNotificationFn(() =>
      Promise.reject(error),
    );
    const gateway = WebPushGateway.createForTesting(sendNotificationFn);

    // When: Push通知を送信
    const result = await gateway.send(testSubscription, testPayload);

    // Then: その他の失敗を示す結果が返り、1回のみ呼ばれる（再送信なし）
    expect(result).toEqual({ outcome: 'failed' });
    expect(sendNotificationFn).toHaveBeenCalledTimes(1);
  });

  test('テスト環境以外でcreateForTestingを呼ぶと例外になる', () => {
    // Given: NODE_ENVをtest以外に変更
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const sendNotificationFn = createMockSendNotificationFn(() =>
      Promise.resolve(testSendResult),
    );

    // When & Then: createForTestingが例外になる
    expect(() => WebPushGateway.createForTesting(sendNotificationFn)).toThrow();

    if (original === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = original;
    }
  });
});
