import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { authSlice } from '@/features/auth/store/authSlice';

const { authSuccess, logout, handleExpiredToken } = authSlice.actions;

/**
 * セッション監視用Listener Middleware
 *
 * Reduxの副作用をReducerの外で管理し、純粋関数性を確保する。
 * 認証状態の変更を監視し、必要に応じてログを出力する。
 */
export const authListenerMiddleware = createListenerMiddleware();

/**
 * 認証成功時のログ出力
 *
 * authSuccessアクションをリッスンし、開発環境でログを出力する。
 */
authListenerMiddleware.startListening({
  matcher: isAnyOf(authSuccess),
  effect: (action) => {
    // 開発環境でのみListenerレベルのログを出力
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
      }
    }
  },
});

/**
 * ログアウト・トークン期限切れ時のログ出力
 *
 * logout・handleExpiredTokenアクションをリッスンし、
 * 開発環境でログを出力する。
 */
authListenerMiddleware.startListening({
  matcher: isAnyOf(logout, handleExpiredToken),
  effect: () => {
    // 開発環境でのみListenerレベルのログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth session cleared');
    }
  },
});
