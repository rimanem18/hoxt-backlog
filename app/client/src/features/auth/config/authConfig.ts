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
 * 環境別ベースURL取得
 * CloudFlare Pages環境変数または実行時originから適切なベースURLを取得
 */
const getBaseUrl = (): string => {
  // 環境変数が優先、次に実行時origin、最後にlocalhost
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'http://localhost:3000';

  // 末尾スラッシュを正規化
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * OAuth認証後のリダイレクト設定
 */
export const AUTH_REDIRECT_CONFIG = {
  /** OAuth認証完了後のリダイレクトパス */
  CALLBACK_PATH: '/auth/callback',
} as const;

/**
 * 安全なリダイレクトURLを生成
 * 実行時の環境に基づいて適切なコールバックURLを構築
 *
 * @returns セキュアなリダイレクトURL
 */
export const createSecureRedirectUrl = (): string => {
  // getBaseUrl()で環境別のベースURLを取得
  const baseUrl = getBaseUrl();

  // コールバックURLを構築
  return `${baseUrl}${AUTH_REDIRECT_CONFIG.CALLBACK_PATH}`;
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
