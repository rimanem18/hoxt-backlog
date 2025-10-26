/**
 * 環境変数取得ユーティリティ
 *
 * アプリケーション全体で使用する環境変数を取得する関数を提供する
 */

/**
 * API Base URLを取得し、/apiサフィックスを追加
 *
 * 環境変数 NEXT_PUBLIC_API_BASE_URL から値を取得し、
 * 末尾に /api を追加して返す
 *
 * @returns API Base URL（/api サフィックス付き）
 *
 * @example
 * ```typescript
 * const apiUrl = getApiBaseUrl();
 * // 本番環境: 'https://abcd.lambda-url.region.on.aws/api'
 * // 開発環境: 'http://localhost:3001/api'
 * ```
 */
export function getApiBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  // 末尾のスラッシュを除去してから/apiを追加
  return `${baseUrl.replace(/\/+$/, '')}/api`;
}
