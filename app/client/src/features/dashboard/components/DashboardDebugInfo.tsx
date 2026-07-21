'use client';

import { useAppSelector } from '@/store/hooks';

/**
 * ダッシュボードの認証状態を開発情報として表示するコンポーネント
 *
 * ユーザーID・最終ログイン日時をデバッグ用に画面に表示する。
 */
export function DashboardDebugInfo(): React.ReactNode {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
      <h3 className="font-semibold text-blue-800 mb-2">開発情報:</h3>
      <p className="text-blue-700">認証状態: 認証済み（AuthGuard保証）</p>
      <p className="text-blue-700">
        ユーザーID: {user?.id ? '設定済み' : '未設定'}
      </p>
      <p className="text-blue-700">
        最終ログイン: {user?.lastLoginAt ? '記録あり' : '未設定'}
      </p>
    </div>
  );
}
