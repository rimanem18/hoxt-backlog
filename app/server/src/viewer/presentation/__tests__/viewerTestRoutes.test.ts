import { beforeEach, describe, expect, test } from 'bun:test';
import { TestInvitationStore } from '@/viewer/infrastructure/TestInvitationStore';
import viewerTest from '../viewerTestRoutes';

describe('viewerTestRoutes', () => {
  beforeEach(() => {
    TestInvitationStore.resetForTesting();
  });

  describe('GET /__test__/invitations', () => {
    test('recipientクエリパラメータなしの場合400を返す', async () => {
      // When: recipientなしでリクエスト
      const res = await viewerTest.request('/__test__/invitations');

      // Then: 400 Bad Requestを返す
      expect(res.status).toBe(400);
    });

    test('記録がない場合404を返す', async () => {
      // When: 記録の無いrecipientでリクエスト
      const res = await viewerTest.request(
        '/__test__/invitations?recipient=not-recorded@example.com',
      );

      // Then: 404 Not Foundを返す
      expect(res.status).toBe(404);
    });

    test('記録済みの送信内容を取得できる', async () => {
      // Given: 送信内容を記録
      TestInvitationStore.getInstance().record({
        recipient: 'viewer@example.com',
        projectName: 'テストプロジェクト',
        accessUrl: 'https://example.com/viewer/raw-token-value',
        sentAt: new Date(),
      });

      // When: recipientクエリで取得
      const res = await viewerTest.request(
        '/__test__/invitations?recipient=viewer@example.com',
      );

      // Then: 記録した内容が取得できる
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.accessUrl).toBe(
        'https://example.com/viewer/raw-token-value',
      );
    });
  });
});
