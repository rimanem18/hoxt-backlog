'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import GlobalErrorToast from '@/features/auth/components/GlobalErrorToast';
import {
  handleExpiredToken,
  restoreAuthState,
  logout,
} from '@/features/google-auth/store/authSlice';
import { validateStoredAuth } from '@/shared/utils/authValidation';
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
  // 5分間データを新鮮と判定し、フォーカス時の自動リフェッチは無効化
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });

  // アプリケーション初回読み込み時に認証状態を検証・復元
  useEffect(() => {
    const validationResult = validateStoredAuth();

    if (validationResult.isValid && validationResult.data) {
      // 検証成功：認証状態をReduxストアに復元
      store.dispatch(
        restoreAuthState({
          user: validationResult.data.user,
          isNewUser: validationResult.data.isNewUser ?? false,
        }),
      );
    } else if (validationResult.reason) {
      // 検証失敗：理由に応じて処理を分岐
      switch (validationResult.reason) {
        case 'expired':
          // 期限切れの場合は専用のハンドラを呼び出す
          store.dispatch(handleExpiredToken());
          break;
        case 'missing':
          // 認証情報がない場合は何もしない（初期状態）
          break;
        default:
          // その他のエラー（不正な形式など）はログアウトとして扱う
          store.dispatch(logout());
          break;
      }
    }
  }, []);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* グローバルエラー表示コンポーネント */}
        <GlobalErrorToast />
      </QueryClientProvider>
    </ReduxProvider>
  );
}
