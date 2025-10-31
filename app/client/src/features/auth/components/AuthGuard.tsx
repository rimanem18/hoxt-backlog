'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useAuthValidation } from '../hooks/useAuthValidation';

/**
 * 認証保護コンポーネント
 * 認証が必要なページをラップして、認証状態に応じてリダイレクトまたはローディング表示を行う
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthRestoring, authError } = useAppSelector(
    (state) => state.auth,
  );
  const router = useRouter();

  // 保護されたページのマウント時にlocalStorageの認証情報を検証
  useAuthValidation();

  useEffect(() => {
    // 認証状態復元が完了していて、未認証またはトークン期限切れの場合のみリダイレクト
    if (
      !isAuthRestoring &&
      (!isAuthenticated || authError?.code === 'EXPIRED')
    ) {
      console.log(
        'AuthGuard: Redirecting to home due to unauthenticated state or expired token',
        { isAuthenticated, authError: authError?.code },
      );
      router.replace('/');
    }
  }, [isAuthRestoring, isAuthenticated, authError, router]);

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

  // 認証済みかつトークンが有効な場合のみコンテンツを表示
  if (isAuthenticated && !authError) {
    return <>{children}</>;
  }

  // リダイレクト実行中は何も表示しない
  return null;
}
