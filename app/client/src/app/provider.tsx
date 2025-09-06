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

type ProviderProps = {
  children: React.ReactNode;
};

/**
 * アプリケーション全体のProvider
 *
 * Redux状態管理とReact Queryデータフェッチングを統合し、
 * クライアントサイド状態管理を一元化する。
 * T004対応: アプリケーション起動時に認証状態を復元する機能を追加。
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

  // T004対応: アプリケーションの初回読み込み時に認証状態を復元する
  // T005対応: 無効JWT検出機能を追加
  useEffect(() => {
    try {
      const persistedState = localStorage.getItem('sb-localhost-auth-token');
      if (persistedState) {
        const authData: {
          user: User;
          expires_at: number | string; // T005: 無効な文字列型もサポート
          access_token?: string;
          isNewUser?: boolean;
        } = JSON.parse(persistedState);

        // 【T005実装】: 無効JWTトークン検出ロジック
        // 【機能概要】: 破損・不正形式のJWTトークンを検出し適切に処理する
        // 【実装方針】: テストケースT005を通すための最小限の検証機能
        // 【テスト対応】: expires_atの型チェックとaccess_tokenの存在確認
        // 🟡 信頼性レベル: テスト要件から導出した妥当な実装

        // 【無効トークン検証1】: expires_at が数値型でない場合は無効とみなす
        const isValidExpiresAt = typeof authData.expires_at === 'number';
        
        // 【無効トークン検証2】: access_tokenが存在し、基本的なJWT構造（3つのパート）を持つこと
        const isValidAccessToken =
          authData.access_token &&
          typeof authData.access_token === 'string' &&
          authData.access_token.split('.').length === 3;

        // 【無効トークン検証3】: ユーザー情報が存在し、IDが設定されていること
        const isValidUser = authData.user && typeof authData.user.id === 'string';

        // 【総合検験】: 全ての必須要素が有効である場合のみ処理を続行
        if (!isValidExpiresAt || !isValidAccessToken || !isValidUser) {
          // 【無効トークン処理】: 無効トークンを検出した場合は期限切れと同様に処理
          console.log('T005: Invalid JWT token detected, clearing authentication');
          store.dispatch(handleExpiredToken());
          return; // 【早期リターン】: 無効検出時は以降の処理をスキップ
        }

        // 【有効期限確認】: 既存のT006期限切れチェック処理（数値型が確定済み）
        // 【型安全性】: TypeScript型チェッカー対応のため、型アサーション使用
        if ((authData.expires_at as number) > Date.now()) {
          // 【認証状態復元】: 全ての検証を通過した場合のみ状態を復元
          store.dispatch(
            restoreAuthState({
              user: authData.user,
              isNewUser: authData.isNewUser ?? false,
            }),
          );
        } else {
          // 【期限切れ処理】: 期限切れの場合は状態をクリア
          store.dispatch(handleExpiredToken());
        }
      }
    } catch (error) {
      // 【エラーハンドリング】: JSON解析失敗や予期しない構造の場合
      console.error('T005: Error parsing auth data, clearing authentication:', error);
      // 【セーフティネット】: パース失敗時なども状態をクリア
      store.dispatch(handleExpiredToken());
    }
  }, []);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ReduxProvider>
  );
}
