'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';

/**
 * 認証保護コンポーネント
 * 認証が必要なページをラップして、認証状態に応じてリダイレクトまたはローディング表示を行う
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthRestoring } = useAppSelector(
    (state) => state.auth,
  );
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 認証状態復元が完了していて、未認証の場合のみリダイレクト
    if (!isAuthRestoring && !isAuthenticated) {
      console.log(
        'AuthGuard: Redirecting to home due to unauthenticated state',
      );
      router.replace('/');
    }
  }, [isAuthRestoring, isAuthenticated, router]);

  // 認証状態復元中はローディング表示
  if (isAuthRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証済みの場合のみコンテンツを表示
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // リダイレクト実行中は何も表示しない
  return null;
}
