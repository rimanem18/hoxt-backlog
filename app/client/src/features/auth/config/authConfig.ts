/**
 * 認証関連設定の一元管理
 *
 * プロバイダー情報、タイミング設定、メッセージを一箴所で管理し、
 * 設定変更の影響範囲を最小化する。
 */

/**
 * サポートする認証プロバイダーの定義
 */
export const SUPPORTED_AUTH_PROVIDERS = ['google', 'apple'] as const;
export type AuthProvider = (typeof SUPPORTED_AUTH_PROVIDERS)[number];

/**
 * 認証プロバイダー別設定
 */
export const AUTH_PROVIDER_CONFIG = {
  google: {
    displayName: 'Google',
    buttonLabel: 'Googleでログイン',
    loadingLabel: '認証中...',
    supabaseProvider: 'google' as const,
  },
  apple: {
    displayName: 'Apple',
    buttonLabel: 'Appleでログイン',
    loadingLabel: '認証中...',
    supabaseProvider: 'apple' as const,
  },
} as const;

/**
 * 認証処理のタイミング設定
 */
export const AUTH_TIMING_CONFIG = {
  /** 連続クリック防止の最小間隔（ミリ秒） */
  DOUBLE_CLICK_THRESHOLD: 500,
  /** 長時間処理メッセージ表示までの時間（ミリ秒） */
  LONG_PROCESS_THRESHOLD: 10000,
  /** 通常の認証処理の想定時間（ミリ秒） */
  TYPICAL_AUTH_DURATION: 3000,
} as const;

/**
 * OAuth認証後のリダイレクト設定
 */
export const AUTH_REDIRECT_CONFIG = {
  /** 許可されたリダイレクト先ドメイン */
  ALLOWED_ORIGINS:
    process.env.NODE_ENV === 'production'
      ? [process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  /** OAuth認証完了後のリダイレクトパス */
  CALLBACK_PATH: '/auth/callback',
} as const;

/**
 * 安全なリダイレクトURLを生成
 *
 * @returns セキュアなリダイレクトURL
 */
export const createSecureRedirectUrl = (): string => {
  // 現在のOriginを取得し許可リストと照合
  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const allowedOrigins = AUTH_REDIRECT_CONFIG.ALLOWED_ORIGINS;

  // 許可されたOriginのみを使用
  const safeOrigin = allowedOrigins.includes(currentOrigin)
    ? currentOrigin
    : allowedOrigins[0];

  // セキュアなリダイレクトURLを構築
  return `${safeOrigin}${AUTH_REDIRECT_CONFIG.CALLBACK_PATH}`;
};

/**
 * ユーザー向けメッセージ定義
 */
export const AUTH_MESSAGES = {
  /** 10秒経過時のユーザー向けメッセージ */
  LONG_PROCESS_MESSAGE: '認証に時間がかかっています...',
  /** 一般的な認証失敗時のメッセージ */
  DEFAULT_ERROR_MESSAGE: '認証に失敗しました',
  /** スクリーンリーダー向けの処理中表示 */
  LOADING_ARIA_LABEL: '認証処理中',
} as const;

export type AuthProviderConfig = typeof AUTH_PROVIDER_CONFIG;
export type AuthTimingConfig = typeof AUTH_TIMING_CONFIG;
export type AuthRedirectConfig = typeof AUTH_REDIRECT_CONFIG;
export type AuthMessages = typeof AUTH_MESSAGES;
