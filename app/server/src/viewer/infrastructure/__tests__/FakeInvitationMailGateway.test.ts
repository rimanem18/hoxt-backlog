import { beforeEach, describe, expect, test } from 'bun:test';
import { FakeInvitationMailGateway } from '../FakeInvitationMailGateway';
import { TestInvitationStore } from '../TestInvitationStore';

describe('FakeInvitationMailGateway', () => {
  beforeEach(() => {
    TestInvitationStore.resetForTesting();
  });

  test('send呼び出しの引数を記録する', async () => {
    // Given: Fakeゲートウェイ
    const gateway = new FakeInvitationMailGateway();

    // When: 送信を実行
    await gateway.send(
      'viewer@example.com',
      'テストプロジェクト',
      'https://example.com/viewer/raw-token-value',
    );

    // Then: 呼び出し内容が記録される
    expect(gateway.getCalls()).toHaveLength(1);
    expect(gateway.getCalls()[0]).toEqual({
      email: 'viewer@example.com',
      projectName: 'テストプロジェクト',
      accessUrl: 'https://example.com/viewer/raw-token-value',
    });
  });

  test('送信成功時にTestInvitationStoreへ記録する', async () => {
    // Given: Fakeゲートウェイ
    const gateway = new FakeInvitationMailGateway();

    // When: 送信を実行
    await gateway.send(
      'viewer@example.com',
      'テストプロジェクト',
      'https://example.com/viewer/raw-token-value',
    );

    // Then: TestInvitationStoreから取得できる
    const found =
      TestInvitationStore.getInstance().findLatestByRecipient(
        'viewer@example.com',
      );
    expect(found?.accessUrl).toBe('https://example.com/viewer/raw-token-value');
  });

  test('queueFailureで注入した失敗が送信時にスローされる', async () => {
    // Given: 失敗を注入したFakeゲートウェイ
    const gateway = new FakeInvitationMailGateway();
    gateway.queueFailure(new Error('SMTP接続エラー'));

    // When & Then: 送信が失敗する
    await expect(
      gateway.send(
        'viewer@example.com',
        'テストプロジェクト',
        'https://example.com/viewer/raw-token-value',
      ),
    ).rejects.toThrow('SMTP接続エラー');
  });

  test('送信失敗時はTestInvitationStoreへ記録しない', async () => {
    // Given: 失敗を注入したFakeゲートウェイ
    const gateway = new FakeInvitationMailGateway();
    gateway.queueFailure(new Error('SMTP接続エラー'));

    // When: 送信が失敗する
    await expect(
      gateway.send(
        'viewer@example.com',
        'テストプロジェクト',
        'https://example.com/viewer/raw-token-value',
      ),
    ).rejects.toThrow();

    // Then: 記録は残らない
    const found =
      TestInvitationStore.getInstance().findLatestByRecipient(
        'viewer@example.com',
      );
    expect(found).toBeNull();
  });

  test('queueFailureは1回分のみ消費され、次回送信は成功する', async () => {
    // Given: 失敗を1回だけ注入したFakeゲートウェイ
    const gateway = new FakeInvitationMailGateway();
    gateway.queueFailure(new Error('一時的なエラー'));

    // When: 1回目は失敗、2回目は成功
    await expect(
      gateway.send('viewer@example.com', 'P', 'https://example.com/1'),
    ).rejects.toThrow();
    await expect(
      gateway.send('viewer@example.com', 'P', 'https://example.com/2'),
    ).resolves.toBeUndefined();

    // Then: 2回目の送信内容が記録される
    const found =
      TestInvitationStore.getInstance().findLatestByRecipient(
        'viewer@example.com',
      );
    expect(found?.accessUrl).toBe('https://example.com/2');
  });
});
