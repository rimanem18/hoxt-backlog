'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authSlice } from '@/features/google-auth/store/authSlice';
import { supabase } from '@/lib/supabase';
import { useAppDispatch } from '@/store/hooks';

/**
 * OAuth認証コールバックページ
 *
 * Google OAuth認証完了後のURLフラグメントからトークンを取得し、
 * Supabaseセッション確立とRedux状態更新を行う。
 */
export default function AuthCallbackPage(): React.ReactNode {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // コールバック処理の進行状況を管理
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing',
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLフラグメントからOAuth認証トークンを取得
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (!accessToken) {
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

          if (error === 'access_denied') {
            // ユーザーキャンセル時はエラー表示なしでホームに戻る
            console.log('ユーザーが認証をキャンセルしました');
            router.push('/');
            return;
          }

          throw new Error(
            errorDescription || error || '認証トークンが見つかりません',
          );
        }

        // E2Eテスト用のモック認証トークンを特別処理
        if (accessToken === 'mock_access_token') {
          // 本番環境でのモック認証を無効化
          const isTestEnvironment =
            process.env.NODE_ENV === 'test' ||
            process.env.NODE_ENV === 'development' ||
            process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';
          if (!isTestEnvironment) {
            console.warn('モック認証は本番環境では無効です');
            setStatus('error');
            setErrorMessage('無効な認証トークンです');
            return;
          }

          // テスト用のユーザー情報を構築
          const mockUser = {
            id: 'mock-user-id',
            externalId: 'mock-user-id',
            provider: 'google' as const,
            email: 'test.user@example.com',
            name: 'Test User',
            avatarUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          // Redux storeに認証成功状態を設定
          dispatch(
            authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
          );

          console.log('モック認証が正常に完了しました:', mockUser);
          setStatus('success');

          // E2Eテストに合わせてダッシュボードに遷移、テスト環境ではディレイあり
          const redirectDelay = process.env.NODE_ENV === 'test' ? 1000 : 0;
          setTimeout(() => {
            router.push('/dashboard');
          }, redirectDelay);
          return;
        }

        // Supabaseセッションを設定
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          throw new Error(
            `Supabaseセッション確立エラー: ${sessionError.message}`,
          );
        }

        // 認証済みユーザーの情報を取得
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData.user) {
          throw new Error(
            `ユーザー情報取得エラー: ${userError?.message || 'ユーザーが見つかりません'}`,
          );
        }

        // ユーザーオブジェクトを構築してReduxに保存
        const user = {
          id: userData.user.id,
          externalId: userData.user.id,
          provider: 'google' as const,
          email: userData.user.email || '',
          name:
            userData.user.user_metadata.full_name || userData.user.email || '',
          avatarUrl: userData.user.user_metadata.avatar_url || null,
          createdAt: userData.user.created_at || new Date().toISOString(),
          updatedAt: userData.user.updated_at || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        // Redux storeに認証成功状態を設定
        dispatch(authSlice.actions.authSuccess({ user, isNewUser: false }));

        console.log('認証が正常に完了しました:', user);
        setStatus('success');

        // 認証成功後はダッシュボードに遷移
        const successRedirectDelay = process.env.NODE_ENV === 'test' ? 1000 : 0;
        setTimeout(() => {
          router.push('/dashboard');
        }, successRedirectDelay);
      } catch (error) {
        // エラー種別に応じた処理
        let userMessage = '認証処理中にエラーが発生しました';
        let logMessage = 'OAuth認証コールバックエラー';

        if (error instanceof Error) {
          // Supabaseセッション関連エラー
          if (error.message.includes('Supabaseセッション確立エラー')) {
            userMessage =
              '認証サービスとの接続に失敗しました。しばらく待ってから再度お試しください。';
            logMessage = 'Supabase認証セッション確立失敗';
          }
          // ユーザー情報取得エラー
          else if (error.message.includes('ユーザー情報取得エラー')) {
            userMessage =
              'ユーザー情報の取得に失敗しました。再度ログインをお試しください。';
            logMessage = 'ユーザー情報取得API失敗';
          }
          // 認証トークン関連エラー
          else if (error.message.includes('認証トークンが見つかりません')) {
            userMessage =
              '認証情報が無効です。最初からログインをやり直してください。';
            logMessage = 'OAuth認証トークン不正または期限切れ';
          }
          // その他の既知エラー
          else {
            userMessage = error.message;
            logMessage = `認証プロセス実行時エラー: ${error.message}`;
          }
        }

        // デバッグ情報とエラースタックを記録
        console.error(`Auth callback error: ${String(logMessage)}`, {
          error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });

        setStatus('error');
        setErrorMessage(userMessage);

        // Redux storeにエラー状態を設定
        dispatch(authSlice.actions.authFailure({ error: userMessage }));

        // エラー発生時のリダイレクト（テスト環境では短縮）
        const errorRedirectDelay =
          process.env.NODE_ENV === 'test' ? 1000 : 3000;
        setTimeout(() => {
          router.push('/');
        }, errorRedirectDelay);
      }
    };

    // コンポーネントマウント時に認証コールバック処理を実行
    handleAuthCallback();
  }, [router, dispatch]);

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
