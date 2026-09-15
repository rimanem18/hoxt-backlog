import { describe, expect, test } from 'bun:test';
import { waitForServiceWorkerReady } from '../lib/waitForServiceWorkerReady';

describe('waitForServiceWorkerReady', () => {
  test('タイムアウト時間内にreadyPromiseが解決すればその値を返す', async () => {
    // Given: 即座に解決するregistration
    const registration = {} as ServiceWorkerRegistration;
    const readyPromise = Promise.resolve(registration);

    // When: タイムアウト時間内に解決を待つ
    const result = await waitForServiceWorkerReady(readyPromise, 1000);

    // Then: readyPromiseの解決値が返る
    expect(result).toBe(registration);
  });

  test('タイムアウト時間内にreadyPromiseが解決しない場合はタイムアウトエラーを投げる', async () => {
    // Given: 永久に解決しないreadyPromise
    const neverResolvingReady = new Promise<ServiceWorkerRegistration>(
      () => {},
    );

    // When & Then: 指定時間内に解決しないためタイムアウトエラーになる
    await expect(
      waitForServiceWorkerReady(neverResolvingReady, 10),
    ).rejects.toThrow('Service Workerのactivateがタイムアウトしました');
  });

  test('タイムアウト前にreadyPromiseが拒否された場合はそのエラーがそのまま伝播する', async () => {
    // Given: 即座に拒否されるreadyPromise
    const rejectionError = new Error('registration failed');
    const readyPromise = Promise.reject(rejectionError);

    // When & Then: readyPromise自体のエラーがそのままスローされる
    await expect(waitForServiceWorkerReady(readyPromise, 1000)).rejects.toBe(
      rejectionError,
    );
  });
});
