import type { User } from '@hoxt-backlog/shared-schemas/auth';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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
 * 認証エラーの種類
 */
export type AuthErrorCode = 'EXPIRED' | 'UNAUTHORIZED' | 'NETWORK_ERROR';

/**
 * 認証エラー情報
 */
export interface AuthError {
  /** エラーコード */
  code: AuthErrorCode;
  /** エラー発生時刻（epoch milliseconds） */
  timestamp: number;
  /** エラーメッセージ */
  message?: string;
}

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
  /** 認証状態復元中のフラグ（ページリロード時のチラツキ防止用） */
  isAuthRestoring: boolean;
  /** 認証エラー情報（正常時はnull） */
  error: string | null;
  /** JWT期限切れなどの認証エラー詳細情報 */
  authError: AuthError | null;
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

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  isAuthRestoring: true,
  error: null,
  authError: null,
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
      state.isAuthRestoring = false; // 認証開始時は復元完了とみなす
      state.error = null;
      state.authError = null;
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
      state.isAuthRestoring = false;
      state.error = null;
      state.authError = null;
      // LocalStorage操作を削除（sessionListenerで処理）
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
      state.authError = null;
      // LocalStorage操作を削除（sessionListenerで処理）
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
      state.isAuthRestoring = false;
      state.error = null;
      state.authError = null;
      // LocalStorage操作を削除（sessionListenerで処理）
    },

    /**
     * 認証状態をクリア（セキュリティ目的）
     * セッション期限切れやセキュリティ問題発生時に使用
     *
     * @param state - 現在の認証状態
     */
    clearAuthState: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
      state.error = null;
      state.authError = null;
      // LocalStorage操作を削除（sessionListenerで処理）
    },

    /**
     * LocalStorageからの認証状態復元
     * ページリロード時に呼び出される認証状態復元専用アクション
     *
     * @param state - 現在の認証状態
     * @param action - 復元する認証状態情報
     */
    restoreAuthState: (state, action: PayloadAction<AuthSuccessPayload>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.isLoading = false;
      state.isAuthRestoring = false;
      state.error = null;
      state.authError = null;
    },

    /**
     * 認証状態復元完了（復元するべき状態がない場合）
     * ページリロード時にLocalStorageに認証情報がない場合の完了処理
     *
     * @param state - 現在の認証状態
     */
    finishAuthRestore: (state) => {
      state.isAuthRestoring = false;
    },

    /**
     * JWT期限切れ専用のエラーハンドリング
     *
     * トークン期限切れを検出した際に認証状態をクリアし、適切なエラー情報を設定
     *
     * @param state - 現在の認証状態
     */
    handleExpiredToken: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
      state.isAuthRestoring = false;
      state.error = null;

      state.authError = {
        code: 'EXPIRED',
        timestamp: Date.now(),
        message: 'セッションの有効期限が切れました',
      };
      // LocalStorage操作とconsole.logを削除（sessionListenerで処理）
    },
  },
});

export const {
  authStart,
  authSuccess,
  authFailure,
  logout,
  clearAuthState,
  restoreAuthState,
  finishAuthRestore,
  handleExpiredToken,
} = authSlice.actions;
export default authSlice.reducer;
