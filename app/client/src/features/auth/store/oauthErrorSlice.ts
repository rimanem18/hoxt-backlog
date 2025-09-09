/**
 * OAuth認証エラー専用のRedux slice
 *
 * ホームページから分離したOAuth認証エラー状態管理の専用slice。
 * セキュリティ対応（XSS攻撃対策・入力値検証）とパフォーマンス最適化を実装。
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * OAuth認証エラーの種別定義
 *
 * E2Eテストで検証された3つのエラーパターン + 汎用エラー。
 * エラー分類により適切な情報開示レベルを制御。
 */
export type OAuthErrorType = 'cancelled' | 'connection' | 'config' | 'unknown';

/**
 * OAuth認証エラー状態の型定義
 *
 * 機密情報漏洩防止のためサニタイズ済みデータのみを管理。
 * 最小限の状態管理でメモリ効率を最適化。
 */
interface OAuthErrorState {
  /** 認証エラーの分類（null = エラーなし） */
  type: OAuthErrorType | null;
  /** サニタイズ済みのユーザー表示用メッセージ */
  message: string;
  /** 再試行処理中かどうかの状態管理 */
  isRetrying: boolean;
  /** エラー発生時刻（デバッグ・分析用） */
  timestamp: number | null;
  /** デバッグ用識別子（機密情報を含まない） */
  correlationId: string | null;
}

/**
 * OAuth認証エラー状態の初期値
 */
const initialState: OAuthErrorState = {
  type: null,
  message: '',
  isRetrying: false,
  timestamp: null,
  correlationId: null,
};

/**
 * 許可されたテストエラータイプのホワイトリスト
 *
 * XSS対策として入力値検証によるクロスサイトスクリプティング攻撃を防止。
 */
const ALLOWED_TEST_ERROR_TYPES: readonly OAuthErrorType[] = [
  'cancelled',
  'connection',
  'config',
] as const;

/**
 * 安全な相関ID生成関数
 *
 * ユーザー情報・セッション情報を含まない安全な識別子を生成。
 * デバッグ時のトレーサビリティを向上させるユニークIDを生成。
 */
const generateSafeCorrelationId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 8);
  return `oauth_${timestamp}_${randomPart}`;
};

/**
 * エラーメッセージのサニタイゼーション
 *
 * XSS対策として危険な文字列を無害化。
 * 機密情報を含む可能性のある詳細エラーを汎用化。
 */
const sanitizeErrorMessage = (
  message: string,
  errorType: OAuthErrorType,
): string => {
  // 基本的な文字列検証
  if (!message || typeof message !== 'string') {
    return getDefaultErrorMessage(errorType);
  }

  // DoS攻撃対策として異常に長いエラーメッセージを制限
  if (message.length > 200) {
    return getDefaultErrorMessage(errorType);
  }

  // HTMLタグやスクリプトの除去
  const sanitized = message
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();

  // サニタイズ後の安全性確認
  return sanitized || getDefaultErrorMessage(errorType);
};

/**
 * エラータイプ別のデフォルトメッセージ取得
 *
 * メッセージの一元管理により保守性を向上。
 */
const getDefaultErrorMessage = (errorType: OAuthErrorType): string => {
  switch (errorType) {
    case 'cancelled':
      return 'Googleログインがキャンセルされました。';
    case 'connection':
      return 'Googleとの接続に問題が発生しました。ネットワーク接続を確認してください。';
    case 'config':
      return 'Google OAuth設定に問題があります。';
    default:
      return '認証処理中にエラーが発生しました。';
  }
};

/**
 * OAuth認証エラー管理専用のRedux slice
 *
 * OAuth認証に関連するエラー状態のみに特化した管理。
 * 他の関心事との分離を保ち、単一責任原則に従う。
 */
const oauthErrorSlice = createSlice({
  name: 'oauthError',
  initialState,
  reducers: {
    /**
     * OAuth認証エラーの設定
     *
     * 入力値検証・XSS対策・機密情報保護を実装。
     * 効率的な状態更新とメモリ管理を提供。
     */
    setOAuthError: (
      state,
      action: PayloadAction<{
        type: OAuthErrorType;
        message?: string;
        correlationId?: string;
      }>,
    ) => {
      const { type, message, correlationId } = action.payload;

      // 効率的で安全な状態管理
      state.type = type;
      state.message = message
        ? sanitizeErrorMessage(message, type)
        : getDefaultErrorMessage(type);
      state.isRetrying = false;
      state.timestamp = Date.now();
      state.correlationId = correlationId || generateSafeCorrelationId();

      // 開発環境のみでデバッグログ出力
      if (process.env.NODE_ENV === 'development') {
        console.log(`OAuth Error Set [${state.correlationId}]:`, {
          type: state.type,
          message: state.message,
          timestamp: new Date(state.timestamp).toISOString(),
        });
      }
    },

    /**
     * OAuth認証エラーのクリア
     *
     * 効率的な状態初期化と不要なデータのクリーンアップ。
     */
    clearOAuthError: (state) => {
      state.type = null;
      state.message = '';
      state.isRetrying = false;
      state.timestamp = null;
      state.correlationId = null;

      // 開発環境でのデバッグログ
      if (process.env.NODE_ENV === 'development') {
        console.log('OAuth Error Cleared');
      }
    },

    /**
     * OAuth再試行状態の管理
     *
     * ユーザーに再試行状態を適切にフィードバック。
     */
    setOAuthRetryState: (
      state,
      action: PayloadAction<{ isRetrying: boolean }>,
    ) => {
      state.isRetrying = action.payload.isRetrying;

      // 再試行終了時のエラークリア
      if (!action.payload.isRetrying) {
        // 再試行が完了したらエラー状態もクリア
        state.type = null;
        state.message = '';
        state.timestamp = null;
        state.correlationId = null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `OAuth Retry State Changed: ${state.isRetrying ? 'Started' : 'Finished'}`,
        );
      }
    },

    /**
     * テスト環境用のセキュアなエラー設定
     *
     * テスト専用のエラー状態設定（本番環境では無効化）。
     * ホワイトリスト方式による安全な入力値検証とE2Eテスト用の制御されたエラー状態生成。
     */
    setTestOAuthError: (
      state,
      action: PayloadAction<{ testErrorType: string }>,
    ) => {
      // 本番環境では無効化
      if (process.env.NODE_ENV === 'production') {
        console.warn('Test OAuth error setting is disabled in production');
        return;
      }

      const { testErrorType } = action.payload;

      // ホワイトリスト方式による厳格な入力値検証
      if (!ALLOWED_TEST_ERROR_TYPES.includes(testErrorType as OAuthErrorType)) {
        console.warn(`Invalid test error type: ${testErrorType}`);
        return;
      }

      const safeErrorType = testErrorType as OAuthErrorType;

      // 制御された安全な状態更新
      state.type = safeErrorType;
      state.message = getDefaultErrorMessage(safeErrorType);
      state.isRetrying = false;
      state.timestamp = Date.now();
      state.correlationId = generateSafeCorrelationId();

      console.log(
        `Test OAuth Error Set: ${safeErrorType} [${state.correlationId}]`,
      );
    },
  },
});

// action creatorsの提供
export const {
  setOAuthError,
  clearOAuthError,
  setOAuthRetryState,
  setTestOAuthError,
} = oauthErrorSlice.actions;

// Redux store用のreducer
export default oauthErrorSlice.reducer;

/**
 * メモ化されたセレクター関数群
 *
 * 一貫したstate accessパターンの提供とTypeScriptによる型安全性を実現。
 */
export const oauthErrorSelectors = {
  /** エラーが発生中かどうか */
  hasError: (state: { oauthError: OAuthErrorState }) =>
    state.oauthError.type !== null,

  /** エラータイプの取得 */
  errorType: (state: { oauthError: OAuthErrorState }) => state.oauthError.type,

  /** エラーメッセージの取得 */
  errorMessage: (state: { oauthError: OAuthErrorState }) =>
    state.oauthError.message,

  /** 再試行状態の取得 */
  isRetrying: (state: { oauthError: OAuthErrorState }) =>
    state.oauthError.isRetrying,

  /** エラー発生時刻の取得 */
  timestamp: (state: { oauthError: OAuthErrorState }) =>
    state.oauthError.timestamp,

  /** 相関IDの取得 */
  correlationId: (state: { oauthError: OAuthErrorState }) =>
    state.oauthError.correlationId,

  /** 特定エラータイプの判定 */
  isCancelledError: (state: { oauthError: OAuthErrorState }) =>
    state.oauthError.type === 'cancelled',
  isConnectionError: (state: { oauthError: OAuthErrorState }) =>
    state.oauthError.type === 'connection',
  isConfigError: (state: { oauthError: OAuthErrorState }) =>
    state.oauthError.type === 'config',
} as const;

/**
 * TypeScript型安全性サポート
 *
 * IntelliSenseと型チェックの完全サポート。
 */
export type { OAuthErrorState };

/**
 * 外部から利用可能なユーティリティ関数
 *
 * 共通処理の一元化により保守性を向上。
 */
export const oauthErrorUtils = {
  generateSafeCorrelationId,
  getDefaultErrorMessage,
  sanitizeErrorMessage,
  ALLOWED_TEST_ERROR_TYPES,
} as const;
