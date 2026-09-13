'use client';

/**
 * Web Push通知の許可要求・購読登録フック
 *
 * ブラウザの通知許可状態を管理し、許可された場合にService Worker登録から
 * 購読登録APIの呼び出しまでを一連の流れとして実行する
 */

import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from '@/lib/apiClientContext';
import { handleApiError } from '@/lib/apiErrorHandler';
import { getVapidPublicKey } from '@/lib/env';
import { debugLog } from '@/lib/utils/logger';
import { saveEndpointToken } from '../lib/subscriptionTokenStore';
import { urlBase64ToUint8Array } from '../lib/vapidKey';

/**
 * 通知許可状態
 *
 * unsupported: ブラウザがWeb Pushをサポートしていない
 */
export type PushPermissionState =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported';

/**
 * ブラウザがWeb Push通知に必要なAPIをサポートしているか判定する
 */
function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * 通知許可状態の初期値を取得する
 */
function getInitialPermissionState(): PushPermissionState {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export function useRegisterPushSubscription(token: string): {
  permissionState: PushPermissionState;
  isRegistering: boolean;
  error: Error | null;
  requestPermission: () => void;
} {
  const apiClient = useApiClient();
  const [permissionState, setPermissionState] = useState<PushPermissionState>(
    getInitialPermissionState,
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Service Worker登録→購読取得→サーバー登録までを一連の処理として実行する。
  // ブラウザの通知許可自体は取得済み（'granted'）であることが前提。
  const registerSubscription = useCallback(async () => {
    setIsRegistering(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      const applicationServerKey = urlBase64ToUint8Array(getVapidPublicKey());
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subscriptionJson = subscription.toJSON();
      const endpoint = subscriptionJson.endpoint;
      const p256dh = subscriptionJson.keys?.p256dh;
      const auth = subscriptionJson.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error('購読情報の取得に失敗しました');
      }

      const { error: apiError } = await apiClient.POST(
        '/viewer/push-subscriptions',
        {
          body: { endpoint, keys: { p256dh, auth } },
        },
      );

      if (apiError) {
        throw new Error(handleApiError(apiError, '購読の登録に失敗しました'));
      }

      // 通知クリック時の遷移先組み立てに使うため、endpoint→トークンの
      // 対応をブラウザ側（IndexedDB）に保存する。失敗しても購読登録自体は
      // 成功しているため、通知登録の成否には影響させない
      try {
        await saveEndpointToken(endpoint, token);
      } catch (err) {
        debugLog.error('endpoint→トークンの保存に失敗しました', err);
      }
    } catch (err) {
      setError(new Error(handleApiError(err, '購読の登録に失敗しました')));
    } finally {
      setIsRegistering(false);
    }
  }, [apiClient, token]);

  const requestPermission = useCallback(() => {
    if (permissionState === 'unsupported') {
      return;
    }

    void (async () => {
      // 既に'granted'の場合、requestPermission()はプロンプトを出さず
      // 即座に'granted'を返す（再試行導線として安全に呼び出せる）
      const permission = await window.Notification.requestPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        await registerSubscription();
      }
    })();
  }, [permissionState, registerSubscription]);

  // ブラウザの通知許可が既に'granted'な状態でこの画面を開いた場合
  // （前回訪問時に許可した、購読が失効した等）、許可要求を待たずに
  // 購読登録を試みることで、購読未登録のまま放置される状態を防ぐ
  // biome-ignore lint/correctness/useExhaustiveDependencies: 初回マウント時の1回のみ実行する
  useEffect(() => {
    if (permissionState === 'granted') {
      void registerSubscription();
    }
  }, []);

  return { permissionState, isRegistering, error, requestPermission };
}
