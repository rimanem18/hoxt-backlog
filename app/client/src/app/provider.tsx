'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import GlobalErrorToast from '@/features/auth/components/GlobalErrorToast';
import {
  finishAuthRestore,
  handleExpiredToken,
  logout,
  restoreAuthState,
} from '@/features/auth/store/authSlice';
import { setAuthErrorCallback, setAuthToken } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import { createQueryClient } from '@/lib/queryClient';
import { validateStoredAuth } from '@/shared/utils/authValidation';
import { validateClientEnv } from '@/shared/utils/validateClientEnv';
import { store } from '@/store';

type ProviderProps = {
  children: React.ReactNode;
};

/**
 * アプリケーション全体のProvider
 * Redux状態管理とReact Queryデータフェッチングを統合
 * 起動時に認証状態を検証し、ストアと同期する
 */
export default function Provider({ children }: ProviderProps) {
  // コンポーネントのライフサイクル内で QueryClient を1回だけ生成
  // useStateの初期化関数を使用して再レンダリング時もインスタンスを保持
  const [queryClient] = useState(() => {
    // Provider初期化時に環境変数を検証（デフォルト値使用）
    validateClientEnv({});
    return createQueryClient();
  });

  // アプリケーション初回読み込み時に認証状態を検証・復元
  useEffect(() => {
    // 401エラー時の自動ログアウト処理を設定
    setAuthErrorCallback((error) => {
      if (error.status === 401) {
        console.warn('[Provider] 401 detected, dispatching handleExpiredToken');
        store.dispatch(handleExpiredToken());
      }
    });

    const validationResult = validateStoredAuth();

    // デバッグ: 検証結果をログ出力
    console.log('[Provider] validateStoredAuth result:', validationResult);

    if (validationResult.isValid && validationResult.data) {
      // 検証成功：認証状態をReduxストアに復元
      store.dispatch(
        restoreAuthState({
          user: validationResult.data.user,
          isNewUser: validationResult.data.isNewUser ?? false,
        }),
      );

      // APIクライアントにJWTトークンを直接設定（sessionListenerに依存しない）
      if (validationResult.data.access_token) {
        setAuthToken(validationResult.data.access_token);
        if (process.env.NODE_ENV === 'development') {
          console.log('[Provider] API client token configured directly');
        }
      }
    } else if (validationResult.reason) {
      // 検証失敗：理由に応じて処理を分岐
      switch (validationResult.reason) {
        case 'expired':
          // 期限切れの場合は専用のハンドラを呼び出す
          store.dispatch(handleExpiredToken());
          break;
        case 'missing':
          // 認証情報がない場合は復元完了をマーク
          store.dispatch(finishAuthRestore());
          break;
        default:
          // その他のエラー（不正な形式など）はログアウトとして扱う
          store.dispatch(logout());
          break;
      }
    } else {
      // 予期しないケース（認証データなし）の場合も復元完了をマーク
      store.dispatch(finishAuthRestore());
    }
  }, []);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider>
          {children}
          {/* グローバルエラー表示コンポーネント */}
          <GlobalErrorToast />
        </ApiClientProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
