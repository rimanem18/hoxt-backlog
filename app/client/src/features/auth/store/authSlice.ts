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
      // テスト状態の基本的な検証
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
  isAuthRestoring: true, // 認証状態復元中フラグ（初期は復元中）
  error: null,
  authError: null,
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
      state.isAuthRestoring = false; // 復元完了
      state.error = null;
      state.authError = null;
      console.log('Authentication state restored from localStorage');
    },

    /**
     * 認証状態復元完了（復元するべき状態がない場合）
     * ページリロード時にLocalStorageに認証情報がない場合の完了処理
     *
     * @param state - 現在の認証状態
     */
    finishAuthRestore: (state) => {
      state.isAuthRestoring = false;
      console.log('Authentication restore completed - no stored auth found');
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
