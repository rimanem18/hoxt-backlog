'use client';

import { LoginButton } from '@/features/auth/components/LoginButton';
import { UserProfile } from '@/features/google-auth/components/UserProfile';
import { HelloWorld } from '@/features/hello-world';
import { useAppSelector } from '@/store/hooks';

/**
 * ホームページコンポーネント
 *
 * Redux状態を監視し、認証状態に基づいてUIを動的に切り替える。
 * 認証済みユーザーにはプロフィール、未認証ユーザーにはログインボタンを表示。
 */
export default function Home(): React.ReactNode {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <div className="font-sans min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto space-y-8">
        {/* Hello World コンポーネント */}
        <HelloWorld />

        <div className="flex flex-col items-center gap-6">
          {isAuthenticated && user ? (
            // 認証済みユーザーにはプロフィールとログアウト機能を表示
            <div className="w-full max-w-md">
              <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
                ようこそ！
              </h2>
              <UserProfile user={user} />
            </div>
          ) : (
            // 未認証ユーザーにはログインボタンを表示
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
                onAuthSuccess={(data) =>
                  console.log('認証に成功しました', data)
                }
                onAuthError={(error) => console.error('認証エラー:', error)}
              />
            </div>
          )}
        </div>

        {/* 開発環境でのみ認証状態をデバッグ表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            <h3 className="font-semibold mb-2">開発情報:</h3>
            <p>認証状態: {isAuthenticated ? '認証済み' : '未認証'}</p>
            <p>
              ユーザー情報: {user ? `${user.name} (${user.email})` : 'なし'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
