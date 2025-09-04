'use client';

import { useRouter } from 'next/navigation';
import { LoginButton } from '@/features/auth/components/LoginButton';
import { HelloWorld } from '@/features/hello-world';
import { useAppSelector } from '@/store/hooks';

/**
 * ホームページコンポーネント
 *
 * 認証状態に関係なくログイン促進メッセージを表示。
 * 認証済みユーザーには自動的にダッシュボードへリダイレクト。
 */
export default function Home(): React.ReactNode {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  // 認証済みユーザーは自動的にダッシュボードへリダイレクト
  if (isAuthenticated && user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="font-sans min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto space-y-8">
        {/* Hello World コンポーネント */}
        <HelloWorld />

        <div className="flex flex-col items-center gap-6">
          {/* 未認証ユーザー向けのログインボタンと促進メッセージ */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">
              アカウントでログイン
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Googleアカウントを使用してログインし、すべての機能をお楽しみください。
            </p>
            <LoginButton
              provider="google"
              className="mx-auto"
              onAuthStart={() => console.log('認証を開始しました')}
              onAuthSuccess={(data) => console.log('認証に成功しました', data)}
              onAuthError={(error) => console.error('認証エラー:', error)}
            />
          </div>
        </div>

        {/* 開発環境でのみ認証状態をデバッグ表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            <h3 className="font-semibold mb-2">開発情報:</h3>
            <p>
              認証状態:{' '}
              {isAuthenticated
                ? '認証済み（ダッシュボードへリダイレクト中）'
                : '未認証'}
            </p>
            <p>
              ユーザー情報: {user ? `${user.name} (${user.email})` : 'なし'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
