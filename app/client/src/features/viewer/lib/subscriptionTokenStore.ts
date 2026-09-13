/**
 * Push購読のendpoint→viewerアクセストークン対応表（IndexedDB）
 *
 * 生アクセストークンをサーバーに送らない方針のため、通知クリック時の
 * 遷移先URL組み立てに使うトークンはブラウザ側（IndexedDB）のみに保持する。
 * Service Worker（sw.js）からも同じDB/ストアを参照する。
 */

const DB_NAME = 'viewer-push-subscriptions';
const STORE_NAME = 'endpoint-tokens';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 購読のendpointに対応する閲覧トークンを保存する
 *
 * 同一ブラウザで複数の招待リンクを開いた場合、直近に登録した購読の
 * トークンで上書きされる（overview.md RISK-05）。
 */
export async function saveEndpointToken(
  endpoint: string,
  token: string,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(token, endpoint);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
