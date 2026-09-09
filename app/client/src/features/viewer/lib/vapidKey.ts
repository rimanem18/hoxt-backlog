/**
 * VAPID公開鍵変換ユーティリティ
 *
 * Web Push APIのapplicationServerKeyはUint8Arrayを要求するが、
 * VAPID公開鍵はURL-safe Base64（'-'/'_'を含み、パディング省略）で提供される。
 */

/**
 * URL-safeなBase64文字列をUint8Arrayへ変換する
 *
 * @param base64String - パディング省略済みのURL-safe Base64文字列
 * @returns デコードされたバイト列
 */
export function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray: Uint8Array<ArrayBuffer> = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
