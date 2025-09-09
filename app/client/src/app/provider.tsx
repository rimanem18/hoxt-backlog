'use client';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/store';
import {
  restoreAuthState,
  handleExpiredToken,
} from '@/features/google-auth/store/authSlice';
import type { User } from '@/packages/shared-schemas/src/auth';
import { validateStoredAuth, getAuthErrorMessage } from '@/shared/utils/authValidation';
import GlobalErrorToast from '@/features/auth/components/GlobalErrorToast';

type ProviderProps = {
  children: React.ReactNode;
};

/**
 * アプリケーション全体のProvider
 * Redux状態管理とReact Queryデータフェッチングを統合
 * 起動時認証状態復元・無効JWT検出機能を提供
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

  // アプリケーション初回読み込み時に認証状態を復元
  useEffect(() => {
    try {
      const persistedState = localStorage.getItem('sb-localhost-auth-token');
      if (persistedState) {
        const authData: {
          user: User;
          expires_at: number | string; // 無効な文字列型もサポート
          access_token?: string;
          isNewUser?: boolean;
        } = JSON.parse(persistedState);

        // 破損・不正形式のJWTトークンを検出し適切に処理

        // expires_atが数値型でない場合は無効とみなす
        const isValidExpiresAt = typeof authData.expires_at === 'number';
        
        // access_tokenが基本的なJWT構造（3つのパート）を持つことを確認
        const isValidAccessToken =
          authData.access_token &&
          typeof authData.access_token === 'string' &&
          authData.access_token.split('.').length === 3;

        // ユーザー情報の存在とID設定を確認
        const isValidUser = authData.user && typeof authData.user.id === 'string';

        // 全ての必須要素が有効な場合のみ処理を続行
        if (!isValidExpiresAt || !isValidAccessToken || !isValidUser) {
          // 無効トークン検出時は期限切れと同様に処理
          console.log('Invalid JWT token detected, clearing authentication');
          store.dispatch(handleExpiredToken());
          return;
        }

        // 期限切れチェック処理（数値型確定済みで型アサーション使用）
        if ((authData.expires_at as number) > Date.now()) {
          // 検証通過時のみ状態を復元
          store.dispatch(
            restoreAuthState({
              user: authData.user,
              isNewUser: authData.isNewUser ?? false,
            }),
          );
        } else {
          // 期限切れ時は状態をクリア
          store.dispatch(handleExpiredToken());
        }
      }
    } catch (error) {
      // JSON解析失敗や予期しない構造の場合
      console.error('Error parsing auth data, clearing authentication:', error);
      // パース失敗時も状態をクリア
      store.dispatch(handleExpiredToken());
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
