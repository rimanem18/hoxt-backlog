'use client';

import { useAppSelector } from '@/store/hooks';

/**
 * ホームページの認証状態を開発情報として表示するコンポーネント
 *
 * 認証状態とユーザー情報をデバッグ用に画面に表示します。
 */
export function HomeAuthDebugInfo(): React.ReactNode {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
      <h3 className="font-semibold mb-2">開発情報:</h3>
      <p>
        認証状態:{' '}
        {isAuthenticated
          ? '認証済み（ダッシュボードへリダイレクト中）'
          : '未認証'}
      </p>
      <p>ユーザー情報: {user ? `${user.name} (${user.email})` : 'なし'}</p>
    </div>
  );
}
