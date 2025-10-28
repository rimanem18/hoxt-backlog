import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { sessionPersistence } from '@/features/auth/services/sessionPersistence';
import { authSlice } from '@/features/auth/store/authSlice';
import type { User } from '@/packages/shared-schemas/src/auth';

const { authSuccess, logout, handleExpiredToken } = authSlice.actions;

/**
 * セッション永続化用Listener Middleware
 *
 * Reduxの副作用をReducerの外で管理し、純粋関数性を確保する。
 * 認証状態の変更に応じてLocalStorageへの保存・削除を実行する。
 */
export const authListenerMiddleware = createListenerMiddleware();

/**
 * 認証成功時にLocalStorageへ保存
 *
 * authSuccessアクションをリッスンし、ユーザー情報をLocalStorageに永続化する。
 */
authListenerMiddleware.startListening({
  matcher: isAnyOf(authSuccess),
  effect: (action) => {
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
      const user = action.payload.user as User;
      sessionPersistence.save(user);

      // 開発環境でのみListenerレベルのログを出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth session saved via listener:', user.id);
      }
    }
  },
});

/**
 * ログアウト・トークン期限切れ時にLocalStorageをクリア
 *
 * logout・handleExpiredTokenアクションをリッスンし、
 * LocalStorageからユーザー情報を削除する。
 */
authListenerMiddleware.startListening({
  matcher: isAnyOf(logout, handleExpiredToken),
  effect: () => {
    sessionPersistence.clear();

    // 開発環境でのみListenerレベルのログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth session cleared via listener');
    }
  },
});
