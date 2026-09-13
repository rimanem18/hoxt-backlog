// viewer閲覧画面のWeb Push購読登録に使用するService Worker。
//
// このファイルはビルドパイプラインを通さない素のJSとして配信されるため、
// endpoint→トークン対応表（IndexedDB）とURL組み立てロジックは
// src/features/viewer/lib/subscriptionTokenStore.ts / notificationClickUrl.ts と
// 同じ仕様をここに再実装している（TypeScript資産をそのままimportできないため）。
const DB_NAME = 'viewer-push-subscriptions';
const STORE_NAME = 'endpoint-tokens';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getTokenByEndpoint(endpoint) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(endpoint);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

function buildNotificationClickUrl(token, taskId) {
  const base = `/viewer/${token}`;
  return taskId ? `${base}?taskId=${encodeURIComponent(taskId)}` : base;
}

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { taskId: payload.taskId },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const subscription = await self.registration.pushManager.getSubscription();
      if (!subscription) {
        return;
      }

      const token = await getTokenByEndpoint(subscription.endpoint);
      if (!token) {
        return;
      }

      const taskId = event.notification.data?.taskId;
      const url = buildNotificationClickUrl(token, taskId);
      await self.clients.openWindow(url);
    })(),
  );
});
