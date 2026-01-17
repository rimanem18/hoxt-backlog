'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginButton } from '@/features/auth/components/LoginButton';
import OAuthErrorDisplay from '@/features/auth/components/OAuthErrorDisplay';
import { OAuthErrorHandler } from '@/features/auth/services/oauthErrorHandler';
import {
  clearOAuthError,
  setOAuthError,
} from '@/features/auth/store/oauthErrorSlice';
import { HelloWorld } from '@/features/hello-world';
import { debugLog } from '@/lib/utils/logger';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * ホームページコンポーネント
 *
 * 認証状態に関係なくログイン促進メッセージを表示。
 * 認証済みユーザーには自動的にダッシュボードへリダイレクト。
 */
export default function Home(): React.ReactNode {
  const { isAuthenticated, user, authError, isAuthRestoring } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();
  const router = useRouter();

  // 認証済みユーザーは自動的にダッシュボードへリダイレクト
  // 認証状態復元完了後のみリダイレクト実行（AuthGuardとの競合回避）
  useEffect(() => {
    if (!isAuthRestoring && isAuthenticated && user) {
      debugLog.auth('Home: Redirecting authenticated user to dashboard');
      router.replace('/dashboard'); // 履歴を残さずリダイレクト
    }
  }, [isAuthRestoring, isAuthenticated, user, router]);

  // 認証状態復元中はローディング表示（ページリロード時のチラツキ防止）
  if (isAuthRestoring) {
    return (
      <div className="font-sans min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto space-y-8">
        {/* Hello World コンポーネント */}
        <HelloWorld />

        {/* 認証エラーメッセージ表示 */}
        {authError && authError.code === 'EXPIRED' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-label="エラー"
                >
                  <title>エラー</title>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  認証に問題があります
                </h3>
                <p className="mt-1 text-sm text-red-600">{authError.message}</p>
                <p className="mt-1 text-sm text-red-600">
                  再度ログインしてください
                </p>
              </div>
            </div>
          </div>
        )}

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
              onAuthStart={() => {
                // Redux経由でエラー状態をクリア
                dispatch(clearOAuthError());
                debugLog.auth('認証を開始しました');
              }}
              onAuthSuccess={() => {
                // Redux経由でエラー状態をクリア
                dispatch(clearOAuthError());
                debugLog.auth('認証に成功しました');
              }}
              onAuthError={(error) => {
                console.error('認証エラー:', error);

                // 統合エラーハンドラーでエラー分析とRedux状態更新
                const errorDetail = OAuthErrorHandler.analyzeError(error);
                dispatch(
                  setOAuthError({
                    type: errorDetail.type,
                    message: errorDetail.userMessage,
                    correlationId: errorDetail.correlationId,
                  }),
                );
              }}
            />

            {/* OAuth認証エラー表示コンポーネント */}
            <OAuthErrorDisplay
              className="mt-4"
              onRetry={() => {
                // ログインボタンの再クリックをシミュレート
                debugLog.auth('OAuth認証を再試行中');
                // 実際の再試行処理は LoginButton 内部で処理される
              }}
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
