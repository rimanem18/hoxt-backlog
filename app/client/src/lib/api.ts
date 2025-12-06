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

/**
 * 現在の認証トークン（モジュールスコープで保持）
 */
let currentAuthToken: string | null = null;

/**
 * ミドルウェアが登録済みかを示すフラグ
 */
let isMiddlewareRegistered = false;

/**
 * JWT認証トークンを設定
 *
 * すべてのリクエストにAuthorizationヘッダーを追加する
 * ミドルウェアは初回のみ登録され、トークンはモジュールスコープで管理される
 *
 * @param token - JWT認証トークン（空文字列不可）
 * @throws {Error} トークンが空文字列の場合
 *
 * @example
 * ```typescript
 * setAuthToken('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');
 * // 以降のすべてのリクエストに Authorization: Bearer {token} が付与される
 *
 * // トークン更新時も同じ関数を使用
 * setAuthToken('new-token-xyz');
 * ```
 */
export function setAuthToken(token: string): void {
  if (token.trim() === '') {
    throw new Error('Token must not be empty');
  }

  currentAuthToken = token;

  if (!isMiddlewareRegistered) {
    apiClient.use({
      onRequest: async ({ request }) => {
        if (currentAuthToken) {
          request.headers.set('Authorization', `Bearer ${currentAuthToken}`);
        }
        return request;
      },
    });
    isMiddlewareRegistered = true;
  }
}

/**
 * 認証トークンをクリア
 *
 * 保持している認証トークンを削除する
 * ミドルウェアは登録されたまま残るが、トークンがnullのため
 * Authorizationヘッダーは追加されなくなる
 *
 * @example
 * ```typescript
 * clearAuthToken();
 * // 以降のリクエストにはAuthorizationヘッダーが付与されなくなる
 * ```
 */
export function clearAuthToken(): void {
  currentAuthToken = null;
}
