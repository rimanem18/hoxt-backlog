/**
 * 型安全なAPIクライアント
 *
 * OpenAPI仕様から自動生成された型定義を使用して、
 * バックエンドAPIと型安全に通信するクライアントを提供する
 *
 * @example
 * ```typescript
 * const { data, error } = await apiClient.GET('/users/{id}', {
 *   params: { path: { id: 'user-id' } },
 * });
 * ```
 */
import createClient from 'openapi-fetch';
import type { paths } from '@/types/api/generated';
import { getApiBaseUrl } from './env';

/**
 * APIクライアントインスタンスを作成
 *
 * @param baseUrl - APIのベースURL
 * @param headers - カスタムヘッダー（認証トークン等）
 * @param options - その他のopenapi-fetchオプション
 * @returns 型安全なAPIクライアント
 */
export function createApiClient(
  baseUrl: string,
  headers?: HeadersInit,
  options?: { fetch?: typeof fetch },
) {
  return createClient<paths>({ baseUrl, headers, ...options });
}

/**
 * デフォルトAPIクライアント
 *
 * 環境変数から設定を読み込み、APIクライアントを初期化する
 * 認証トークンは後で動的に設定する想定
 */
export const apiClient = createApiClient(getApiBaseUrl());
