import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { authSlice } from '@/features/auth/store/authSlice';
import { clearAuthToken, setAuthToken } from '@/lib/api';
import {
  clearStoredAuth,
  validateStoredAuth,
} from '@/shared/utils/authValidation';

const {
  authSuccess,
  authFailure,
  restoreAuthState,
  logout,
  handleExpiredToken,
  clearAuthState,
} = authSlice.actions;

/**
 * セッション監視用Listener Middleware
 *
 * Reduxの副作用をReducerの外で管理し、純粋関数性を確保する。
 * 認証状態の変更を監視し、必要に応じてログを出力する。
 */
export const authListenerMiddleware = createListenerMiddleware();

/**
 * 認証成功・認証状態復元時にAPIクライアントにトークンを設定
 *
 * authSuccess・restoreAuthStateアクションをリッスンし、
 * LocalStorageからaccess_tokenを取得してAPIクライアントに設定する。
 */
authListenerMiddleware.startListening({
  matcher: isAnyOf(authSuccess, restoreAuthState),
  effect: (action) => {
    // LocalStorageから認証データを取得
    const validationResult = validateStoredAuth();

    if (validationResult.isValid && validationResult.data?.access_token) {
      // APIクライアントにJWTトークンを設定
      setAuthToken(validationResult.data.access_token);

      // 開発環境でのログ出力
      if (process.env.NODE_ENV === 'development') {
        // PayloadActionの型ガード
        if (
          'payload' in action &&
          action.payload &&
          typeof action.payload === 'object' &&
          'user' in action.payload &&
          action.payload.user !== null &&
          typeof action.payload.user === 'object' &&
          'id' in action.payload.user
        ) {
          console.log('Auth session established:', action.payload.user.id);
          console.log('API client token configured');
        }
      }
    } else {
      // トークンが取得できない場合は警告ログ
      console.warn(
        'Auth token not found in localStorage after successful auth',
      );
    }
  },
});

/**
 * 認証解除時の後始末処理
 *
 * authFailure・logout・handleExpiredToken・clearAuthStateアクションをリッスンし、
 * APIクライアントからトークンを削除し、LocalStorageもクリアする。
 */
authListenerMiddleware.startListening({
  matcher: isAnyOf(authFailure, logout, handleExpiredToken, clearAuthState),
  effect: () => {
    // APIクライアントからJWTトークンを削除
    clearAuthToken();

    // LocalStorageから認証データを削除
    clearStoredAuth();

    // 開発環境でのログ出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth session cleared');
      console.log('API client token removed');
      console.log('LocalStorage auth data cleared');
    }
  },
});
