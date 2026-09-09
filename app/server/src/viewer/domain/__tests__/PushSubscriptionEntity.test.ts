import { describe, expect, test } from 'bun:test';
import { InvalidViewerDataError } from '../errors';
import { PushSubscriptionEntity } from '../PushSubscriptionEntity';

describe('PushSubscriptionEntity', () => {
  describe('create', () => {
    test('有効な入力から購読エンティティが生成される', () => {
      // Given: 有効な購読情報
      const input = {
        email: 'viewer@example.com',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: 'p256dh-key-value',
        authKey: 'auth-key-value',
      };

      // When: 購読エンティティを生成
      const subscription = PushSubscriptionEntity.create(input);

      // Then: 各プロパティが保持される
      expect(subscription.getEmail()).toBe('viewer@example.com');
      expect(subscription.getEndpoint()).toBe(input.endpoint);
      expect(subscription.getP256dhKey()).toBe('p256dh-key-value');
      expect(subscription.getAuthKey()).toBe('auth-key-value');
    });

    test('emailが正規化（trim + 小文字化）されて保持される', () => {
      // Given: 前後空白と大文字を含むemail
      const input = {
        email: '  Viewer@Example.COM  ',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: 'p256dh-key-value',
        authKey: 'auth-key-value',
      };

      // When: 購読エンティティを生成
      const subscription = PushSubscriptionEntity.create(input);

      // Then: 正規化された値が保持される
      expect(subscription.getEmail()).toBe('viewer@example.com');
    });

    test('生成のたびに異なるidが割り振られる', () => {
      // Given: 同一の入力
      const input = {
        email: 'viewer@example.com',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: 'p256dh-key-value',
        authKey: 'auth-key-value',
      };

      // When: 2件の購読エンティティを生成
      const first = PushSubscriptionEntity.create(input);
      const second = PushSubscriptionEntity.create(input);

      // Then: idが異なる
      expect(first.getId()).not.toBe(second.getId());
    });

    test('不正な形式のemailでエラーが発生する', () => {
      // Given: 不正な形式のemail
      const input = {
        email: 'not-an-email',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: 'p256dh-key-value',
        authKey: 'auth-key-value',
      };

      // When & Then: バリデーションエラーが発生
      expect(() => PushSubscriptionEntity.create(input)).toThrow(
        InvalidViewerDataError,
      );
    });

    test('空文字のendpointでエラーが発生する', () => {
      // Given: 空文字のendpoint
      const input = {
        email: 'viewer@example.com',
        endpoint: '',
        p256dhKey: 'p256dh-key-value',
        authKey: 'auth-key-value',
      };

      // When & Then: バリデーションエラーが発生
      expect(() => PushSubscriptionEntity.create(input)).toThrow(
        InvalidViewerDataError,
      );
    });

    test('空文字のp256dhKeyでエラーが発生する', () => {
      // Given: 空文字のp256dhKey
      const input = {
        email: 'viewer@example.com',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: '',
        authKey: 'auth-key-value',
      };

      // When & Then: バリデーションエラーが発生
      expect(() => PushSubscriptionEntity.create(input)).toThrow(
        InvalidViewerDataError,
      );
    });

    test('空文字のauthKeyでエラーが発生する', () => {
      // Given: 空文字のauthKey
      const input = {
        email: 'viewer@example.com',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: 'p256dh-key-value',
        authKey: '',
      };

      // When & Then: バリデーションエラーが発生
      expect(() => PushSubscriptionEntity.create(input)).toThrow(
        InvalidViewerDataError,
      );
    });
  });

  describe('reconstruct', () => {
    test('永続化データから復元できる', () => {
      // Given: 永続化済みのプロパティ
      const props = {
        id: 'subscription-1',
        email: 'viewer@example.com',
        endpoint: 'https://push.example.com/subscription/abc',
        p256dhKey: 'p256dh-key-value',
        authKey: 'auth-key-value',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      };

      // When: エンティティを復元
      const subscription = PushSubscriptionEntity.reconstruct(props);

      // Then: プロパティがそのまま保持される
      expect(subscription.getId()).toBe('subscription-1');
      expect(subscription.getEmail()).toBe('viewer@example.com');
      expect(subscription.getEndpoint()).toBe(props.endpoint);
      expect(subscription.getP256dhKey()).toBe('p256dh-key-value');
      expect(subscription.getAuthKey()).toBe('auth-key-value');
      expect(subscription.getCreatedAt()).toEqual(props.createdAt);
      expect(subscription.getUpdatedAt()).toEqual(props.updatedAt);
    });
  });
});
