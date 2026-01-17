'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import type { Dispatch, UnknownAction } from 'redux';
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
import { debugLog } from '@/lib/utils/logger';
import type { AuthValidationResult } from '@/shared/utils/authValidation';
import { validateStoredAuth } from '@/shared/utils/authValidation';
import { validateClientEnv } from '@/shared/utils/validateClientEnv';
import { store } from '@/store';

/**
 * Provider の依存サービス型定義
 *
 * テスト用の依存注入を可能にする
 */
export interface ProviderServices {
  /** Redux store */
  store: {
    dispatch: Dispatch<UnknownAction>;
  };
  /** API エラーコールバック設定関数 */
  setAuthErrorCallback: (
    callback: (error: { status: number; message?: string }) => void,
  ) => void;
  /** API トークン設定関数 */
  setAuthToken: (token: string) => void;
  /** 認証状態検証関数 */
  validateStoredAuth: () => AuthValidationResult;
  /** 認証状態復元アクション */
  restoreAuthState: typeof restoreAuthState;
  /** 認証復元完了アクション */
  finishAuthRestore: typeof finishAuthRestore;
  /** トークン期限切れハンドラアクション */
  handleExpiredToken: typeof handleExpiredToken;
  /** ログアウトアクション */
  logout: typeof logout;
}

type ProviderProps = {
  children: React.ReactNode;
  /** テスト用のサービス注入（省略時はデフォルトのservicesを使用） */
  services?: ProviderServices;
};

/**
 * アプリケーション全体のProvider
 * Redux状態管理とReact Queryデータフェッチングを統合
 * 起動時に認証状態を検証し、ストアと同期する
 */
export default function Provider({ children, services }: ProviderProps) {
  // services が未指定の場合はデフォルトのservicesを使用
  const authServices = useMemo(
    () =>
      services ?? {
        store,
        setAuthErrorCallback,
        setAuthToken,
        validateStoredAuth,
        restoreAuthState,
        finishAuthRestore,
        handleExpiredToken,
        logout,
      },
    [services],
  );

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
    authServices.setAuthErrorCallback((error) => {
      if (error.status === 401) {
        debugLog.warn('401 detected, dispatching handleExpiredToken');
        authServices.store.dispatch(authServices.handleExpiredToken());
      }
    });

    const validationResult = authServices.validateStoredAuth();

    debugLog.redactedAuth('validateStoredAuth result', validationResult);

    if (validationResult.isValid && validationResult.data) {
      // 検証成功：認証状態をReduxストアに復元
      authServices.store.dispatch(
        authServices.restoreAuthState({
          user: validationResult.data.user,
          isNewUser: validationResult.data.isNewUser ?? false,
        }),
      );

      // APIクライアントにJWTトークンを直接設定（sessionListenerに依存しない）
      if (validationResult.data.access_token) {
        authServices.setAuthToken(validationResult.data.access_token);
        debugLog.auth('API client token configured directly');
      }
    } else if (validationResult.reason) {
      // 検証失敗：理由に応じて処理を分岐
      switch (validationResult.reason) {
        case 'expired':
          // 期限切れの場合は専用のハンドラを呼び出す
          authServices.store.dispatch(authServices.handleExpiredToken());
          break;
        case 'missing':
          // 認証情報がない場合は復元完了をマーク
          authServices.store.dispatch(authServices.finishAuthRestore());
          break;
        default:
          // その他のエラー（不正な形式など）はログアウトとして扱う
          authServices.store.dispatch(authServices.logout());
          break;
      }
    } else {
      // 予期しないケース（認証データなし）の場合も復元完了をマーク
      authServices.store.dispatch(authServices.finishAuthRestore());
    }
  }, [authServices]);

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
