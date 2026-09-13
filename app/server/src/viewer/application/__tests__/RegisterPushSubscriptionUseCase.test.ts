import { describe, expect, mock, test } from 'bun:test';
import type { IPushSubscriptionRepository } from '@/viewer/domain/IPushSubscriptionRepository';
import type { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';
import { RegisterPushSubscriptionUseCase } from '../RegisterPushSubscriptionUseCase';

function createDeps() {
  const pushSubscriptionRepository: IPushSubscriptionRepository = {
    findByEmail: mock(() => Promise.resolve([])),
    save: mock((entity: PushSubscriptionEntity) => Promise.resolve(entity)),
    deleteByEndpoint: mock(() => Promise.resolve()),
  };

  return { pushSubscriptionRepository };
}

describe('RegisterPushSubscriptionUseCase', () => {
  test('新規購読を保存できる', async () => {
    // Given: 新規購読の入力
    const deps = createDeps();
    const useCase = new RegisterPushSubscriptionUseCase(
      deps.pushSubscriptionRepository,
    );
    const input = {
      email: 'viewer@example.com',
      endpoint: 'https://push.example.com/subscription/abc',
      p256dhKey: 'p256dh-key-value',
      authKey: 'auth-key-value',
    };

    // When: 購読を登録
    const saved = await useCase.execute(input);

    // Then: リポジトリのsave()が呼ばれ、保存結果が返る
    expect(deps.pushSubscriptionRepository.save).toHaveBeenCalled();
    expect(saved.getEmail()).toBe('viewer@example.com');
    expect(saved.getEndpoint()).toBe(input.endpoint);
    expect(saved.getP256dhKey()).toBe('p256dh-key-value');
    expect(saved.getAuthKey()).toBe('auth-key-value');
  });
});
