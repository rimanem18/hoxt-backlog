import { beforeEach, describe, expect, test } from 'bun:test';
import { TestInvitationStore } from '../TestInvitationStore';

describe('TestInvitationStore', () => {
  beforeEach(() => {
    TestInvitationStore.resetForTesting();
  });

  test('recordした送信内容をrecipientで取得できる', () => {
    // Given: 送信内容を記録
    const store = TestInvitationStore.getInstance();
    store.record({
      recipient: 'viewer@example.com',
      projectName: 'テストプロジェクト',
      accessUrl: 'https://example.com/viewer/raw-token-value',
      sentAt: new Date(),
    });

    // When: recipientで取得
    const found = store.findLatestByRecipient('viewer@example.com');

    // Then: 記録した内容が取得できる
    expect(found).not.toBeNull();
    expect(found?.accessUrl).toBe('https://example.com/viewer/raw-token-value');
  });

  test('recipientの大文字小文字を区別せず取得できる', () => {
    // Given: 小文字で記録
    const store = TestInvitationStore.getInstance();
    store.record({
      recipient: 'viewer@example.com',
      projectName: 'テストプロジェクト',
      accessUrl: 'https://example.com/viewer/raw-token-value',
      sentAt: new Date(),
    });

    // When: 大文字混在のrecipientで取得
    const found = store.findLatestByRecipient('Viewer@Example.com');

    // Then: 正規化されて取得できる
    expect(found).not.toBeNull();
  });

  test('同一recipientに複数回記録した場合、最新の内容を取得する', () => {
    // Given: 同一recipientへ2回記録
    const store = TestInvitationStore.getInstance();
    store.record({
      recipient: 'viewer@example.com',
      projectName: '古いプロジェクト',
      accessUrl: 'https://example.com/viewer/old-token',
      sentAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    store.record({
      recipient: 'viewer@example.com',
      projectName: '新しいプロジェクト',
      accessUrl: 'https://example.com/viewer/new-token',
      sentAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    // When: recipientで取得
    const found = store.findLatestByRecipient('viewer@example.com');

    // Then: 最後に記録した内容が取得できる
    expect(found?.accessUrl).toBe('https://example.com/viewer/new-token');
  });

  test('記録が存在しないrecipientの場合nullを返す', () => {
    // When: 記録のないrecipientで取得
    const store = TestInvitationStore.getInstance();
    const found = store.findLatestByRecipient('not-recorded@example.com');

    // Then: nullが返される
    expect(found).toBeNull();
  });

  test('resetForTestingで記録がクリアされる', () => {
    // Given: 記録済みの内容
    const store = TestInvitationStore.getInstance();
    store.record({
      recipient: 'viewer@example.com',
      projectName: 'テストプロジェクト',
      accessUrl: 'https://example.com/viewer/raw-token-value',
      sentAt: new Date(),
    });

    // When: resetForTestingを実行
    TestInvitationStore.resetForTesting();

    // Then: 記録が取得できなくなる
    const found =
      TestInvitationStore.getInstance().findLatestByRecipient(
        'viewer@example.com',
      );
    expect(found).toBeNull();
  });

  test('テスト環境以外でresetForTestingを呼ぶと例外になる', () => {
    // Given: NODE_ENVをtest以外に変更
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // When & Then: resetForTestingが例外になる
    expect(() => TestInvitationStore.resetForTesting()).toThrow();

    if (original === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = original;
    }
  });
});
