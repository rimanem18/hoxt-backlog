/**
 * 【Redux Store設定】: アプリケーション全体の状態管理を統括するStore設定
 * 【設計方針】: Redux Toolkit使用による型安全性とパフォーマンスの両立
 * 【拡張性】: 将来的な機能追加に対応できるモジュラー設計
 * 🟢 信頼性レベル: Redux Toolkit公式パターンに基づく確実な実装
 */

import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from '@/features/google-auth/store/authSlice';

/**
 * 【Redux Store構成】: 認証機能を中心とした状態管理
 * 【ミドルウェア】: Redux Toolkit標準のdevTools・serializabilityCheck有効
 * 【型安全性】: TypeScriptでの厳密な型チェック対応
 */
export const store = configureStore({
  reducer: {
    // 【認証状態管理】: authSliceによる認証関連状態の管理
    auth: authSlice.reducer,
    // 【将来拡張予定】: user・ui・settingsなどのsliceを追加予定
  },

  // 【開発環境支援】: Redux DevTools拡張機能の有効化
  devTools: process.env.NODE_ENV !== 'production',

  // 【ミドルウェア設定】: デフォルトミドルウェアの使用
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // 【シリアライゼーション】: stateの直列化可能性チェック
      serializableCheck: {
        // 【除外設定】: Redux Toolkitで問題となりうるアクションを除外
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

/**
 * 【型定義エクスポート】: TypeScriptでの型安全性確保
 * 【用途】: コンポーネント・フックでの型推論に使用
 * 🟢 信頼性レベル: Redux Toolkit公式推奨パターン
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * 【型安全フック用型定義】: useSelector・useDispatchの型安全版作成用
 * 【利便性】: 各コンポーネントで型アサーションが不要
 */
export type AppStore = typeof store;
