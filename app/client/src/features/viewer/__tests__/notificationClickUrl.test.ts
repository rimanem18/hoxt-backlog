import { describe, expect, test } from 'bun:test';
import { buildNotificationClickUrl } from '../lib/notificationClickUrl';

describe('buildNotificationClickUrl', () => {
  test('taskIdが指定されている場合はクエリパラメータ付きのURLになる', () => {
    // Given: トークンとtaskId
    const token = 'raw-token-abc';
    const taskId = 'task-123';

    // When: URLを組み立てる
    const url = buildNotificationClickUrl(token, taskId);

    // Then: /viewer/{token}?taskId={taskId}の形式になる
    expect(url).toBe('/viewer/raw-token-abc?taskId=task-123');
  });

  test('taskIdが未指定の場合はトークンのみのURLになる', () => {
    // Given: トークンのみ
    const token = 'raw-token-abc';

    // When: URLを組み立てる
    const url = buildNotificationClickUrl(token);

    // Then: /viewer/{token}の形式になる
    expect(url).toBe('/viewer/raw-token-abc');
  });

  test('taskIdに特殊文字が含まれる場合はエンコードされる', () => {
    // Given: URLエンコードが必要なtaskId
    const token = 'raw-token-abc';
    const taskId = 'task/with?special&chars';

    // When: URLを組み立てる
    const url = buildNotificationClickUrl(token, taskId);

    // Then: taskIdがエンコードされる
    expect(url).toBe(
      '/viewer/raw-token-abc?taskId=task%2Fwith%3Fspecial%26chars',
    );
  });
});
