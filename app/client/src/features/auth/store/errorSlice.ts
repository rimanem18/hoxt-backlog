/**
 * 【機能概要】: グローバルエラー状態管理用のRedux slice
 * 【実装方針】: T007テストを通すために最小限のエラー状態管理機能を実装
 * 【テスト対応】: ネットワークエラーメッセージ表示テストケースを満たすための実装
 * 🟡 信頼性レベル: 一般的なWebアプリケーションエラーハンドリングパターンからの妥当な推測
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * エラー種別の定義
 * 【分類目的】: 異なる種類のエラーを適切に分類して処理するため
 */
type ErrorType = 'network' | 'auth' | 'validation' | 'unknown';

/**
 * エラー状態の型定義
 * 【構造設計】: テストで求められるエラー情報を格納するための最小構造
 */
interface ErrorState {
  /** 【エラー表示制御】: エラーメッセージの表示・非表示制御 */
  isVisible: boolean;
  /** 【エラー内容】: ユーザーに表示するエラーメッセージ */
  message: string;
  /** 【エラー種別】: エラーの種類を分類（将来的な拡張用） */
  type: ErrorType;
  /** 【詳細情報】: デバッグ・ログ用の詳細エラー情報（オプション） */
  details?: string;
}

/**
 * エラー状態の初期値
 * 【初期化方針】: エラーなしの状態から開始
 */
const initialState: ErrorState = {
  isVisible: false,
  message: '',
  type: 'unknown',
  details: undefined,
};

/**
 * エラー管理用のRedux slice
 * 【責任範囲】: グローバルなエラー状態の管理のみに特化
 */
const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    /**
     * 【機能概要】: ネットワークエラーを表示する
     * 【実装方針】: T007テストで期待される「ネットワーク接続を確認してください」メッセージの表示
     * 【テスト対応】: T007のネットワークエラーメッセージ表示検証に対応
     * 🟡 信頼性レベル: テスト要件から導出した妥当な実装
     */
    showNetworkError: (state, action: PayloadAction<{ message?: string; details?: string }>) => {
      // 【最小実装】: テストを通すための最もシンプルな実装
      // 【ハードコーディング許可】: リファクタ段階で改善予定のため、現段階では固定値でOK
      state.isVisible = true;
      state.message = action.payload.message || 'ネットワーク接続を確認してください';
      state.type = 'network';
      state.details = action.payload.details;
      
      // 【デバッグログ】: 開発時の動作確認用ログ
      console.log('T007: Network error displayed:', state.message);
    },

    /**
     * 【機能概要】: 表示中のエラーを非表示にする
     * 【実装方針】: ユーザーがエラーを確認後に非表示にするための機能
     * 【テスト対応】: エラー状態のクリア機能（将来の拡張用）
     * 🟡 信頼性レベル: 一般的なUI状態管理パターンからの妥当な推測
     */
    clearError: (state) => {
      // 【状態初期化】: エラー状態を初期状態にリセット
      state.isVisible = false;
      state.message = '';
      state.type = 'unknown';
      state.details = undefined;
      
      // 【デバッグログ】: エラークリア動作の確認用
      console.log('T007: Error state cleared');
    },

    /**
     * 【機能概要】: 汎用エラー表示機能
     * 【実装方針】: ネットワークエラー以外のエラーにも対応できる拡張可能な実装
     * 【テスト対応】: 将来的なテストケース拡張に備えた柔軟な実装
     * 🟡 信頼性レベル: エラーハンドリングの一般的なパターンからの妥当な推測
     */
    showError: (state, action: PayloadAction<{ message: string; type?: ErrorType; details?: string }>) => {
      // 【柔軟性重視】: 様々なエラー種別に対応可能な汎用実装
      state.isVisible = true;
      state.message = action.payload.message;
      state.type = action.payload.type || 'unknown';
      state.details = action.payload.details;
      
      // 【デバッグログ】: エラー種別ごとの動作確認用
      console.log(`T007: Error displayed [${state.type}]:`, state.message);
    },
  },
});

// 【エクスポート】: Redux storeで使用するためのaction creators
export const { showNetworkError, clearError, showError } = errorSlice.actions;

// 【エクスポート】: Redux storeで使用するためのreducer
export default errorSlice.reducer;

// 【型エクスポート】: 他のコンポーネントで使用するための型定義
export type { ErrorState, ErrorType };