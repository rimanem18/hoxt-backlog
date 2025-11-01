/**
 * OAuth コールバック処理を抽象化するカスタムフック
 */

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { GoogleAuthProvider } from '@/features/auth/services/providers/googleAuthProvider';
import { MockAuthProvider } from '@/features/auth/services/providers/mockAuthProvider';
import { authSlice } from '@/features/auth/store/authSlice';
import { useAppDispatch } from '@/store/hooks';

type CallbackStatus = 'processing' | 'success' | 'error';

/**
 * OAuth コールバック処理を抽象化するカスタムフック
 *
 * Provider の選択と認証フローを管理し、UIコンポーネントから
 * 認証処理の詳細を分離する。
 *
 * @example
 * ```typescript
 * const { status, errorMessage, handleCallback } = useOAuthCallback();
 *
 * useEffect(() => {
 *   handleCallback('google');
 * }, [handleCallback]);
 * ```
 */
export const useOAuthCallback = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleCallback = useCallback(
    async (_providerType: 'google' | 'mock') => {
      try {
        // URLフラグメントを取得
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const accessToken = hashParams.get('access_token');

        // Provider を選択（モックトークンなら MockAuthProvider）
        const authProvider =
          accessToken === 'mock_access_token'
            ? new MockAuthProvider()
            : new GoogleAuthProvider();

        // Provider に callback 処理を委譲
        const result = await authProvider.handleCallback(hashParams);

        if (!result.success) {
          // ユーザーキャンセル（access_denied）
          console.log('ユーザーが認証をキャンセルしました');
          setStatus('error');
          setErrorMessage('認証がキャンセルされました');
          setTimeout(() => {
            router.push('/');
          }, 1000);
          return;
        }

        // Redux に認証成功を通知
        if (!result.user) {
          throw new Error('ユーザー情報が取得できませんでした');
        }

        dispatch(
          authSlice.actions.authSuccess({
            user: result.user,
            isNewUser: result.isNewUser,
          }),
        );

        console.log('認証が正常に完了しました:', result.user);
        setStatus('success');

        // 認証成功後はダッシュボードに遷移
        const redirectDelay = process.env.NODE_ENV === 'test' ? 1000 : 0;
        setTimeout(() => {
          router.push('/dashboard');
        }, redirectDelay);
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
    },
    [dispatch, router],
  );

  return { status, errorMessage, handleCallback };
};
