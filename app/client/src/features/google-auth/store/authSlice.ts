import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/packages/shared-schemas/src/auth';

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
  error: null
};

/**
 * 認証状態管理のRedux slice
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
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
    }
  }
});

export const { authSuccess } = authSlice.actions;
export default authSlice.reducer;