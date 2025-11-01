'use client';

import { useEffect } from 'react';
import { useOAuthCallback } from '@/features/auth/hooks/useOAuthCallback';

/**
 * OAuth認証コールバックページ
 *
 * Google OAuth認証完了後のURLフラグメントからトークンを取得し、
 * Supabaseセッション確立とRedux状態更新を行う。
 */
export default function AuthCallbackPage(): React.ReactNode {
  const { status, errorMessage, handleCallback } = useOAuthCallback();

  useEffect(() => {
    handleCallback('google');
  }, [handleCallback]);

  // 処理状態に応じたUIを表示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              認証処理中...
            </h2>
            <p className="text-gray-600">しばらくお待ちください</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-600 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-labelledby="success-icon-title"
              >
                <title id="success-icon-title">認証成功アイコン</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              認証完了！
            </h2>
            <p className="text-gray-600">ホームページに移動しています...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-600 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-labelledby="error-icon-title"
              >
                <title id="error-icon-title">エラーアイコン</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              認証エラー
            </h2>
            <p className="text-red-600 mb-4">{errorMessage}</p>
            <p className="text-gray-600 text-sm">
              3秒後にホームページに戻ります
            </p>
          </>
        )}
      </div>
    </div>
  );
}
