/**
 * Redux Store設定
 * アプリケーション全体の状態管理を統括し、Redux Toolkitで型安全性を確保
 */

import { configureStore } from '@reduxjs/toolkit';
import errorReducer from '@/features/auth/store/errorSlice';
import oauthErrorReducer from '@/features/auth/store/oauthErrorSlice';
import { authSlice } from '@/features/google-auth/store/authSlice';

/**
 * Redux Store構成
 * 認証機能を中心とした状態管理とTypeScript型安全性を確保
 */
export const store = configureStore({
  reducer: {
    // authSliceによる認証関連状態の管理
    auth: authSlice.reducer,
    // 【T007実装】: グローバルエラー状態管理
    error: errorReducer,
    // 【T008 Refactor実装】: OAuth認証エラー専用状態管理
    oauthError: oauthErrorReducer,
    // 将来拡張予定: user・ui・settingsなどのsliceを追加予定
  },

  // Redux DevTools拡張機能の有効化
  devTools: process.env.NODE_ENV !== 'production',

  // ミドルウェア設定
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // stateの直列化可能性チェック
      serializableCheck: {
        // Redux Toolkitで問題となりうるアクションを除外
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

/**
 * TypeScriptでの型安全性確保用型定義エクスポート
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * useSelector・useDispatchの型安全版作成用型定義
 */
export type AppStore = typeof store;
