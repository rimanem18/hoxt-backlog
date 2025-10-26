/**
 * APIクライアントのContext Provider
 *
 * テスト時にmockFetchを注入可能にするため、Contextパターンを採用
 * 本番環境では既存のapiClientシングルトンを使用
 */
'use client';

import type createClientOriginal from 'openapi-fetch';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import type { paths } from '@/types/api/generated';
import { apiClient } from './api';

type ApiClient = ReturnType<typeof createClientOriginal<paths>>;

const ApiClientContext = createContext<ApiClient | null>(null);

export interface ApiClientProviderProps {
  /** Provider内で使用するAPIクライアント（テスト用） */
  client?: ApiClient;
  children: ReactNode;
}

/**
 * APIクライアントを提供するProvider
 *
 * @param client - カスタムAPIクライアント（テスト用、省略時はapiClientを使用）
 * @param children - 子コンポーネント
 *
 * @example
 * ```tsx
 * // 本番環境（デフォルトのapiClientを使用）
 * <ApiClientProvider>
 *   <App />
 * </ApiClientProvider>
 *
 * // テスト環境（mockFetchを注入）
 * const mockClient = createApiClient('http://test', undefined, { fetch: mockFetch });
 * <ApiClientProvider client={mockClient}>
 *   <TestComponent />
 * </ApiClientProvider>
 * ```
 */
export function ApiClientProvider({
  children,
  client,
}: ApiClientProviderProps) {
  // clientが未指定の場合はデフォルトのapiClientを使用
  const defaultClient = useMemo(() => client || apiClient, [client]);

  return (
    <ApiClientContext.Provider value={defaultClient}>
      {children}
    </ApiClientContext.Provider>
  );
}

/**
 * APIクライアントを取得するフック
 *
 * ApiClientProvider内で使用する必要がある
 *
 * @returns 型安全なAPIクライアント
 * @throws {Error} ApiClientProviderが見つからない場合
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const apiClient = useApiClient();
 *   const { data } = await apiClient.GET('/users/{id}', {
 *     params: { path: { id: 'user-id' } }
 *   });
 * }
 * ```
 */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error(
      'useApiClient must be used within ApiClientProvider. ' +
        'Wrap your component with <ApiClientProvider>.',
    );
  }
  return client;
}
