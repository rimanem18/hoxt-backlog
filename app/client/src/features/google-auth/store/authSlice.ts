import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../../../packages/shared-schemas/src/auth';

/**
 * 【機能概要】: 認証状態を管理するRedux Toolkit slice
 * 【実装方針】: テストケースを通すために必要最小限の状態管理のみを実装
 * 【テスト対応】: authSlice.test.ts の初期化・状態更新テストを通すための実装
 * 🟢 信頼性レベル: AuthState型定義・テストケース仕様から直接抽出
 */

/**
 * 認証状態の型定義
 * 【型定義】: アプリケーション全体の認証状態を表現
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
 * 【型定義】: 認証完了時に受け取るユーザー情報
 */
interface AuthSuccessPayload {
  /** 認証済みユーザー情報 */
  user: User;
  /** 新規ユーザーかどうかのフラグ */
  isNewUser: boolean;
}

// 【初期状態定義】: アプリケーション起動時の未認証状態
// 【テスト要件対応】: authSlice.test.ts の初期値確認テストを通すための設定
const initialState: AuthState = {
  isAuthenticated: false, // 【未認証状態】: 初期は認証されていない状態
  user: null, // 【ユーザー情報なし】: 認証前はユーザー情報は存在しない
  isLoading: false, // 【ローディングなし】: 初期はローディング状態ではない
  error: null // 【エラーなし】: 初期はエラー状態ではない
};

/**
 * 【Redux Slice実装】: 認証状態管理の核となるslice定義
 * 【実装方針】: createSliceを使用してactionとreducerを自動生成
 * 🟢 信頼性レベル: Redux Toolkit標準パターン・テスト仕様から直接実装
 */
export const authSlice = createSlice({
  name: 'auth', // 【slice名】: Redux stateでの認証状態のキー名
  initialState,
  reducers: {
    /**
     * 【認証成功アクション】: Google認証完了時の状態更新
     * 【実装内容】: 認証フラグON・ユーザー情報設定・ローディング終了・エラークリア
     * 【テスト対応】: authSlice.test.ts の状態更新テストを通すための実装
     * 🟢 信頼性レベル: テストケースの期待値から直接実装
     */
    authSuccess: (state, action: PayloadAction<AuthSuccessPayload>) => {
      // 【認証状態更新】: 認証完了をマーク
      state.isAuthenticated = true;
      // 【ユーザー情報設定】: バックエンドから取得したユーザー情報を設定
      state.user = action.payload.user;
      // 【ローディング終了】: 認証処理完了のためローディング状態を終了
      state.isLoading = false;
      // 【エラー状態クリア】: 正常完了のためエラー情報をクリア
      state.error = null;
    }
  }
});

// 【アクション・reducer エクスポート】: コンポーネントから使用できるよう公開
export const { authSuccess } = authSlice.actions;
export default authSlice.reducer;