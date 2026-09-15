/**
 * Service Workerのactivateをタイムアウト付きで待機する
 *
 * @param readyPromise - Service Worker登録のreadyPromise
 * @param timeoutMs - タイムアウト時間（ミリ秒）
 * @returns readyPromiseが解決した場合はServiceWorkerRegistrationを返す
 * @throws タイムアウト時は Error('Service Workerのactivateがタイムアウトしました')
 * @throws readyPromiseが拒否された場合はそのエラー
 */
export function waitForServiceWorkerReady(
  readyPromise: Promise<ServiceWorkerRegistration>,
  timeoutMs: number,
): Promise<ServiceWorkerRegistration> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Service Workerのactivateがタイムアウトしました'));
    }, timeoutMs);
  });

  return Promise.race([readyPromise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });
}
