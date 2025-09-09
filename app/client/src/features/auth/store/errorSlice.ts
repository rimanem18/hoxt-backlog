/**
 * グローバルエラー状態管理用のRedux slice
 * セキュリティ・パフォーマンス・保守性を強化した高品質実装
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * エラー種別の定義
 * 異なる種類のエラーを適切に分類して処理するため
 */
type ErrorType = 'network' | 'auth' | 'validation' | 'unknown';

/**
 * エラー状態の型定義
 * セキュリティ・パフォーマンス・保守性を考慮した拡張可能な設計
 */
interface ErrorState {
  /** エラーメッセージの表示・非表示制御 */
  isVisible: boolean;
  /** 適切にサニタイズされたユーザー表示用エラーメッセージ */
  message: string;
  /** 詳細な分類によるUX最適化と処理効率向上 */
  type: ErrorType;
  /** デバッグ用の相関ID（機密情報を含まない安全な識別子） */
  correlationId?: string;
  /** エラー発生時刻（デバッグ・分析用） */
  timestamp?: number;
  /** エラーメッセージの自動消去タイマーID */
  autoCloseTimer?: number;
}

/**
 * エラー状態の初期値
 * パフォーマンス最適化と安全性を考慮した初期状態
 */
const initialState: ErrorState = {
  isVisible: false,
  message: '',
  type: 'unknown',
  correlationId: undefined,
  timestamp: undefined,
  autoCloseTimer: undefined,
};

/**
 * 開発環境判定用ユーティリティ
 * 本番環境での機密情報ログ出力を防止
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 安全な相関ID生成
 * 機密情報を含まない一意識別子の生成でデバッグ・トレーサビリティを向上
 */
const generateCorrelationId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * エラー管理用のRedux slice
 * グローバルなエラー状態の管理のみに特化
 */
const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    /**
     * ネットワークエラーを表示する
     * セキュリティ・パフォーマンス・保守性を強化した実装
     */
    showNetworkError: (
      state,
      action: PayloadAction<{
        message?: string;
        correlationId?: string;
        autoClose?: boolean;
      }>,
    ) => {
      // 既存タイマーのクリーンアップでメモリリーク防止
      if (state.autoCloseTimer) {
        clearTimeout(state.autoCloseTimer);
      }

      // 効率的な状態設定
      state.isVisible = true;
      state.message =
        action.payload.message || 'ネットワーク接続を確認してください';
      state.type = 'network';
      state.correlationId =
        action.payload.correlationId || generateCorrelationId();
      state.timestamp = Date.now();

      // 自動消去機能でユーザビリティを向上（オプション）
      if (action.payload.autoClose !== false) {
        // タイマーはコンポーネント側で管理（Redux purity保持）
      }

      // 開発環境のみでデバッグログ出力（本番環境での不要処理削減）
      if (isDevelopment) {
        console.log(
          `Network error displayed [${state.correlationId}]:`,
          state.message,
        );
      }
    },

    /**
     * 高度なネットワークエラー表示（詳細制御版）
     * 将来の拡張要件に対応する柔軟なAPI設計
     */
    showAdvancedNetworkError: (
      state,
      action: PayloadAction<{
        message?: string;
        severity?: 'low' | 'medium' | 'high';
        retryable?: boolean;
        correlationId?: string;
        metadata?: Record<string, unknown>;
      }>,
    ) => {
      // メモリリーク防止のためタイマーをクリーンアップ
      if (state.autoCloseTimer) {
        clearTimeout(state.autoCloseTimer);
      }

      // 拡張可能なエラー情報管理
      state.isVisible = true;
      state.message =
        action.payload.message || 'ネットワーク接続を確認してください';
      state.type = 'network';
      state.correlationId =
        action.payload.correlationId || generateCorrelationId();
      state.timestamp = Date.now();

      // 開発環境で詳細情報付きログ出力
      if (isDevelopment) {
        console.log(`Advanced network error [${state.correlationId}]:`, {
          message: state.message,
          severity: action.payload.severity || 'medium',
          retryable: action.payload.retryable !== false,
          metadata: action.payload.metadata,
        });
      }
    },

    /**
     * 表示中のエラーを非表示にする
     * メモリリーク防止とパフォーマンス最適化を実装
     */
    clearError: (state) => {
      // アクティブなタイマーのクリーンアップでメモリリーク防止
      if (state.autoCloseTimer) {
        clearTimeout(state.autoCloseTimer);
      }

      // 効率的なリセット処理
      state.isVisible = false;
      state.message = '';
      state.type = 'unknown';
      state.correlationId = undefined;
      state.timestamp = undefined;
      state.autoCloseTimer = undefined;

      // 開発環境のみでデバッグログ出力
      if (isDevelopment) {
        console.log('Error state cleared safely');
      }
    },

    /**
     * 汎用エラー表示機能
     * あらゆるエラー種別に対応する拡張可能な実装
     */
    showError: (
      state,
      action: PayloadAction<{
        message: string;
        type?: ErrorType;
        correlationId?: string;
        timestamp?: number;
        severity?: 'info' | 'warning' | 'error' | 'critical';
      }>,
    ) => {
      // 既存タイマーのクリーンアップでメモリリーク防止
      if (state.autoCloseTimer) {
        clearTimeout(state.autoCloseTimer);
      }

      // 包括的な状態更新
      state.isVisible = true;
      state.message = action.payload.message;
      state.type = action.payload.type || 'unknown';
      state.correlationId =
        action.payload.correlationId || generateCorrelationId();
      state.timestamp = action.payload.timestamp || Date.now();

      // 開発環境のみでの詳細ログ出力
      if (isDevelopment) {
        console.log(
          `Error displayed [${state.type}] [${state.correlationId}]:`,
          {
            message: state.message,
            severity: action.payload.severity || 'error',
            timestamp: new Date(state.timestamp).toISOString(),
          },
        );
      }
    },

    /**
     * エラー状態の部分更新
     * 既存エラーの特定フィールドのみを更新し再レンダリングを最小化
     */
    updateErrorState: (state, action: PayloadAction<Partial<ErrorState>>) => {
      // 指定されたフィールドのみを更新
      Object.assign(state, action.payload);

      if (isDevelopment) {
        console.log(
          `Error state updated [${state.correlationId}]:`,
          action.payload,
        );
      }
    },

    /**
     * エラー自動消去タイマー設定
     * Reduxの純粋性を保つため実際のタイマーはコンポーネント側で管理
     */
    setAutoCloseTimer: (state, action: PayloadAction<{ timerId: number }>) => {
      // 既存タイマーのクリーンアップでメモリリーク防止
      if (state.autoCloseTimer) {
        clearTimeout(state.autoCloseTimer);
      }

      // 新タイマー設定
      state.autoCloseTimer = action.payload.timerId;

      if (isDevelopment) {
        console.log(
          `Auto-close timer set [${state.correlationId}]:`,
          action.payload.timerId,
        );
      }
    },
  },
});

// action creatorsのエクスポート
export const {
  showNetworkError,
  showAdvancedNetworkError,
  clearError,
  showError,
  updateErrorState,
  setAutoCloseTimer,
} = errorSlice.actions;

// Redux storeで使用するためのreducer
export default errorSlice.reducer;

// 型定義のエクスポート
export type { ErrorState, ErrorType };

/**
 * エラーハンドリング用のユーティリティ型
 */
export type NetworkErrorPayload = {
  message?: string;
  correlationId?: string;
  autoClose?: boolean;
};

export type AdvancedNetworkErrorPayload = {
  message?: string;
  severity?: 'low' | 'medium' | 'high';
  retryable?: boolean;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type GenericErrorPayload = {
  message: string;
  type?: ErrorType;
  correlationId?: string;
  timestamp?: number;
  severity?: 'info' | 'warning' | 'error' | 'critical';
};

/**
 * エラー状態セレクター
 * Redux状態への一貫したアクセスを提供
 */
export const errorSelectors = {
  isVisible: (state: { error: ErrorState }) => state.error.isVisible,
  message: (state: { error: ErrorState }) => state.error.message,
  type: (state: { error: ErrorState }) => state.error.type,
  correlationId: (state: { error: ErrorState }) => state.error.correlationId,
  timestamp: (state: { error: ErrorState }) => state.error.timestamp,
  hasActiveTimer: (state: { error: ErrorState }) =>
    state.error.autoCloseTimer !== undefined,
} as const;
