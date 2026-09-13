'use client';

/**
 * Web Push通知許可要求UI
 *
 * 通知許可状態に応じてメッセージまたは許可要求ボタンを表示する
 */

import { FormAlert } from '@/shared/components/FormAlert';
import { useViewerServices } from '../lib/ViewerServicesContext';

interface PushNotificationPermissionProps {
  /** viewerアクセストークン（通知クリック時の遷移先組み立てに使用） */
  token: string;
}

export function PushNotificationPermission(
  props: PushNotificationPermissionProps,
): React.ReactNode {
  const { useRegisterPushSubscription } = useViewerServices();
  const { permissionState, isRegistering, error, requestPermission } =
    useRegisterPushSubscription(props.token);

  if (permissionState === 'unsupported') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 flex flex-col gap-2 sm:gap-3">
      {permissionState === 'granted' && !error && (
        <p className="text-sm text-gray-700">通知は許可されています</p>
      )}
      {permissionState === 'granted' && error && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-700">通知の購読登録に失敗しました</p>
          <button
            type="button"
            disabled={isRegistering}
            onClick={requestPermission}
            className="min-h-[44px] px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isRegistering ? '登録中...' : '再試行する'}
          </button>
        </div>
      )}
      {permissionState === 'denied' && (
        <p className="text-sm text-gray-700">
          通知が拒否されています。ブラウザの設定から許可してください
        </p>
      )}
      {permissionState === 'default' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-700">
            タスクの更新をブラウザ通知で受け取れます
          </p>
          <button
            type="button"
            disabled={isRegistering}
            onClick={requestPermission}
            className="min-h-[44px] px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isRegistering ? '登録中...' : '通知を許可する'}
          </button>
        </div>
      )}
      {error && <FormAlert variant="error" message={error.message} />}
    </div>
  );
}
