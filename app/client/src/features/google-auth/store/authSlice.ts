import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/packages/shared-schemas/src/auth';

/**
 * 認証状態を管理するRedux Toolkit slice。
 * Google認証の成功時にユーザー情報と認証状態を更新する。
 *
 * @example
 * ```typescript
 * const store = configureStore({
 *   reducer: {
 *     auth: authSlice.reducer
 *   }
 * });
 * ```
 */

/**
 * 認証状態の型定義
 */
export interface AuthState {
  /** 認証済みかどうかのフラグ */
  isAuthenticated: boolean;
  /** 認証済みユーザー情報（未認証時はnull） */
  user: User | null;
  /** 認証処理中のローディング状態 */
  isLoading: boolean;
  /** 認証エラー情報（正常時はnull） */
  error: string | null;
}

/**
 * テスト専用のグローバル型定義
 */
declare global {
  interface Window {
    __TEST_REDUX_AUTH_STATE__?: Partial<AuthState>;
  }
}

/**
 * 認証成功アクションのペイロード型
 */
interface AuthSuccessPayload {
  /** 認証済みユーザー情報 */
  user: User;
  /** 新規ユーザーかどうかのフラグ */
  isNewUser: boolean;
}

/**
 * テスト環境での認証状態読み込み
 * E2Eテスト時にモック状態を適用するための仕組み
 */
const getTestAuthState = (): Partial<AuthState> | null => {
  if (typeof window !== 'undefined' && window.__TEST_REDUX_AUTH_STATE__) {
    try {
      // 【セキュリティ改善】: テスト状態の基本的な検証
      const testState = window.__TEST_REDUX_AUTH_STATE__;
      if (testState && typeof testState === 'object') {
        return testState;
      }
    } catch (error) {
      console.warn('テスト状態の読み込みでエラーが発生:', error);
    }
  }
  return null;
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  // テスト状態があれば適用（E2Eテスト専用）
  ...getTestAuthState(),
};

/**
 * 認証状態管理のRedux slice
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * 認証開始時の状態更新
     *
     * @param state - 現在の認証状態
     */
    authStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    /**
     * 認証成功時の状態更新
     *
     * @param state - 現在の認証状態
     * @param action - 認証成功時のユーザー情報を含むアクション
     */
    authSuccess: (state, action: PayloadAction<AuthSuccessPayload>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.isLoading = false;
      state.error = null;
    },

    /**
     * 認証失敗時の状態更新
     *
     * @param state - 現在の認証状態
     * @param action - 認証失敗時のエラー情報を含むアクション
     */
    authFailure: (state, action: PayloadAction<{ error: string }>) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
      state.error = action.payload.error;
    },

    /**
     * ログアウト時の状態更新
     *
     * @param state - 現在の認証状態
     */
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
      state.error = null;
    },

    /**
     * 【Refactor追加】: 認証状態をクリア（セキュリティ目的）
     * セッション期限切れやセキュリティ問題発生時に使用
     *
     * @param state - 現在の認証状態
     */
    clearAuthState: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
      state.error = null;
      // セキュリティクリアランス用のログ
      console.info('認証状態がセキュリティ目的でクリアされました');
    },

    /**
     * 【Refactor追加】: テスト用認証状態設定
     * E2Eテスト専用の状態設定アクション
     *
     * @param state - 現在の認証状態
     * @param action - テスト用の認証状態
     */
    setAuthState: (state, action: PayloadAction<Partial<AuthState>>) => {
      // 開発環境とテスト環境でのみ使用可能
      if (process.env.NODE_ENV === 'production') {
        console.warn('本番環境では setAuthState は使用できません');
        return;
      }
      
      const { isAuthenticated, user, isLoading, error } = action.payload;
      if (isAuthenticated !== undefined) state.isAuthenticated = isAuthenticated;
      if (user !== undefined) state.user = user;
      if (isLoading !== undefined) state.isLoading = isLoading;
      if (error !== undefined) state.error = error;
    },
  },
});

export const { authStart, authSuccess, authFailure, logout, clearAuthState, setAuthState } =
  authSlice.actions;
export default authSlice.reducer;
