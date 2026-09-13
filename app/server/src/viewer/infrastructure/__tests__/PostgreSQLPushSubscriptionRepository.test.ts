import { beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '@/shared/database/DatabaseConnection';
import { viewerPushSubscriptions } from '@/shared/database/schema';
import { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';
import { PostgreSQLPushSubscriptionRepository } from '../PostgreSQLPushSubscriptionRepository';

describe('PostgreSQLPushSubscriptionRepository', () => {
  let repository: PostgreSQLPushSubscriptionRepository;
  const testEmail = 'push-repo-test@example.com';
  const testEmail2 = 'push-repo-test2@example.com';

  beforeEach(async () => {
    repository = new PostgreSQLPushSubscriptionRepository(db);

    await db
      .delete(viewerPushSubscriptions)
      .where(
        sql`lower(${viewerPushSubscriptions.email}) IN (${testEmail}, ${testEmail2})`,
      );
  });

  describe('save', () => {
    test('新規購読を保存できる', async () => {
      // Given: 新規購読のエンティティ
      const entity = PushSubscriptionEntity.create({
        email: testEmail,
        endpoint: 'https://push.example.com/subscription/new',
        p256dhKey: 'p256dh-1',
        authKey: 'auth-1',
      });

      // When: 購読を保存
      const saved = await repository.save(entity);

      // Then: 保存された購読が返される
      expect(saved.getId()).toBe(entity.getId());
      expect(saved.getEmail()).toBe(testEmail);
      expect(saved.getEndpoint()).toBe(
        'https://push.example.com/subscription/new',
      );
      expect(saved.getP256dhKey()).toBe('p256dh-1');
      expect(saved.getAuthKey()).toBe('auth-1');
    });

    test('同一email・endpointでの再保存は新規行を増やさず鍵情報を上書きする', async () => {
      // Given: 既存購読が保存されている
      const original = PushSubscriptionEntity.create({
        email: testEmail,
        endpoint: 'https://push.example.com/subscription/dup',
        p256dhKey: 'old-p256dh',
        authKey: 'old-auth',
      });
      await repository.save(original);

      // When: 同一email・endpointで新しい鍵情報を保存
      const reregistered = PushSubscriptionEntity.create({
        email: testEmail,
        endpoint: 'https://push.example.com/subscription/dup',
        p256dhKey: 'new-p256dh',
        authKey: 'new-auth',
      });
      await repository.save(reregistered);

      // Then: 行数は増えず、鍵情報が上書きされる
      const found = await repository.findByEmail(testEmail);
      expect(found).toHaveLength(1);
      expect(found[0]?.getP256dhKey()).toBe('new-p256dh');
      expect(found[0]?.getAuthKey()).toBe('new-auth');
    });

    test('大文字小文字が異なるemailでも同一購読として上書きされる', async () => {
      // Given: 小文字emailで保存済みの購読
      const original = PushSubscriptionEntity.create({
        email: testEmail,
        endpoint: 'https://push.example.com/subscription/case',
        p256dhKey: 'old-p256dh',
        authKey: 'old-auth',
      });
      await repository.save(original);

      // When: 大文字を含むemailで同一endpointを再保存
      const reregistered = PushSubscriptionEntity.create({
        email: testEmail.toUpperCase(),
        endpoint: 'https://push.example.com/subscription/case',
        p256dhKey: 'new-p256dh',
        authKey: 'new-auth',
      });
      await repository.save(reregistered);

      // Then: 行数は増えない
      const found = await repository.findByEmail(testEmail);
      expect(found).toHaveLength(1);
      expect(found[0]?.getP256dhKey()).toBe('new-p256dh');
    });
  });

  describe('findByEmail', () => {
    test('emailに紐づく複数デバイス分の購読を返せる', async () => {
      // Given: 同一emailで2件の購読
      await repository.save(
        PushSubscriptionEntity.create({
          email: testEmail,
          endpoint: 'https://push.example.com/subscription/device1',
          p256dhKey: 'p256dh-1',
          authKey: 'auth-1',
        }),
      );
      await repository.save(
        PushSubscriptionEntity.create({
          email: testEmail,
          endpoint: 'https://push.example.com/subscription/device2',
          p256dhKey: 'p256dh-2',
          authKey: 'auth-2',
        }),
      );

      // When: emailで購読一覧を取得
      const found = await repository.findByEmail(testEmail);

      // Then: 2件の購読が返る
      expect(found).toHaveLength(2);
    });

    test('購読が存在しない場合は空配列を返す', async () => {
      // Given: 購読が存在しないemail

      // When: emailで購読一覧を取得
      const found = await repository.findByEmail(testEmail2);

      // Then: 空配列が返る
      expect(found).toEqual([]);
    });
  });

  describe('deleteByEndpoint', () => {
    test('email・endpointを指定して購読を削除できる', async () => {
      // Given: 保存済みの購読
      await repository.save(
        PushSubscriptionEntity.create({
          email: testEmail,
          endpoint: 'https://push.example.com/subscription/to-delete',
          p256dhKey: 'p256dh-1',
          authKey: 'auth-1',
        }),
      );

      // When: 該当購読を削除
      await repository.deleteByEndpoint(
        testEmail,
        'https://push.example.com/subscription/to-delete',
      );

      // Then: 購読が見つからなくなる
      const found = await repository.findByEmail(testEmail);
      expect(found).toEqual([]);
    });
  });
});
