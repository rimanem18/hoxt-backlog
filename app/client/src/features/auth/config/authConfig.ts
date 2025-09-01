/**
 * 【認証設定】: 認証関連の設定値とプロバイダー情報を一元管理
 * 【設計方針】: 設定値の変更時に複数ファイルを修正する必要性を排除
 * 【保守性】: 設定変更の影響範囲を限定し、メンテナンス性を向上
 * 🟢 信頼性レベル: 既存実装から抽出した確実な設定値
 */

/**
 * 【認証プロバイダー定義】: サポートする認証プロバイダーの列挙
 * 【拡張性】: 将来的なプロバイダー追加に備えた設計
 * 🟢 信頼性レベル: 現在の要件から直接抽出
 */
export const SUPPORTED_AUTH_PROVIDERS = ['google', 'apple'] as const;
export type AuthProvider = typeof SUPPORTED_AUTH_PROVIDERS[number];

/**
 * 【プロバイダー別設定】: 各認証プロバイダーの表示・設定情報
 * 【国際化対応】: 将来的な多言語対応を考慮した構造
 * 🟡 信頼性レベル: 現在の実装から推測した設定構造
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
 * 【タイミング設定】: 認証処理に関わるタイムアウト・間隔設定
 * 【調整指針】: ユーザビリティテストや実運用データに基づく最適化が可能
 * 🟡 信頼性レベル: UX要件とエッジケーステストからの妥当な推測
 */
export const AUTH_TIMING_CONFIG = {
  /** 【ダブルクリック防止】: 連続クリック防止の最小間隔（ミリ秒） */
  DOUBLE_CLICK_THRESHOLD: 500,
  
  /** 【長時間処理検出】: 長時間処理メッセージ表示までの時間（ミリ秒） */
  LONG_PROCESS_THRESHOLD: 10000,
  
  /** 【OAuth処理】: 通常の認証処理の想定時間（ミリ秒） */
  TYPICAL_AUTH_DURATION: 3000,
} as const;

/**
 * 【リダイレクト設定】: OAuth認証後のリダイレクト先設定
 * 【セキュリティ考慮】: 許可されたドメインでのみリダイレクトを実行
 * 🟡 信頼性レベル: セキュリティベストプラクティスに基づく設計
 */
export const AUTH_REDIRECT_CONFIG = {
  /** 【本番環境】: 許可されたリダイレクト先ドメイン */
  ALLOWED_ORIGINS: process.env.NODE_ENV === 'production'
    ? [process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    
  /** 【コールバックパス】: OAuth認証完了後のリダイレクトパス */
  CALLBACK_PATH: '/auth/callback',
} as const;

/**
 * 【ユーティリティ関数】: 安全なリダイレクトURL生成
 * 【セキュリティ強化】: Host Header Attack対策を実装
 * 【実装方針】: 許可されたOriginのみでリダイレクト先を構築
 * 🟡 信頼性レベル: セキュリティ要件からの妥当な実装
 */
export const createSecureRedirectUrl = (): string => {
  // 【Origin検証】: 現在のOriginが許可リストに含まれるかを確認
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const allowedOrigins = AUTH_REDIRECT_CONFIG.ALLOWED_ORIGINS;
  
  // 【安全なOrigin選択】: 許可されたOriginのみを使用
  const safeOrigin = allowedOrigins.includes(currentOrigin) 
    ? currentOrigin 
    : allowedOrigins[0];
  
  // 【URL構築】: セキュアなリダイレクトURLを生成
  return `${safeOrigin}${AUTH_REDIRECT_CONFIG.CALLBACK_PATH}`;
};

/**
 * 【メッセージ設定】: ユーザー向けメッセージのテキスト定義
 * 【国際化準備】: 将来的な多言語対応を考慮したメッセージ管理
 * 🟢 信頼性レベル: 既存実装から直接抽出
 */
export const AUTH_MESSAGES = {
  /** 【長時間処理】: 10秒経過時のユーザー向けメッセージ */
  LONG_PROCESS_MESSAGE: '認証に時間がかかっています...',
  
  /** 【エラーメッセージ】: 一般的な認証失敗時のメッセージ */
  DEFAULT_ERROR_MESSAGE: '認証に失敗しました',
  
  /** 【ARIA対応】: スクリーンリーダー向けの処理中表示 */
  LOADING_ARIA_LABEL: '認証処理中',
} as const;

/**
 * 【型定義エクスポート】: 各設定オブジェクトの型を外部利用可能に
 * 【用途】: TypeScript環境での型安全性確保と開発効率向上
 * 🟢 信頼性レベル: TypeScript標準パターンに基づく確実な型定義
 */
export type AuthProviderConfig = typeof AUTH_PROVIDER_CONFIG;
export type AuthTimingConfig = typeof AUTH_TIMING_CONFIG;
export type AuthRedirectConfig = typeof AUTH_REDIRECT_CONFIG;
export type AuthMessages = typeof AUTH_MESSAGES;