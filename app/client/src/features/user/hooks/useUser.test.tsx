import { afterEach, beforeEach, expect, type Mock, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import { useUser } from './useUser';

// DI方式のモックfetch
type MockFetch = Mock<[input: Request], Promise<Response>>;
let mockFetch: MockFetch;
let queryClient: QueryClient;

beforeEach(() => {
  mockFetch = mock();
  // 各テストで新しいQueryClientを作成し、キャッシュを分離
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // テスト時はリトライしない
      },
    },
  });
});

afterEach(() => {
  queryClient.clear();
  mock.restore();
  mock.clearAllMocks();
});

test('React QueryフックuseUserが正しい型を返す', async () => {
  // Given: モックfetchで成功レスポンスを返す設定
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUser = {
    id: userId,
    externalId: '1234567890',
    provider: 'google' as const,
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null,
  };

  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        data: mockUser,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );

  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  // When: useUserフックを呼び出し
  const { result } = renderHook(() => useUser(userId), { wrapper });

  // Then: 非同期処理が完了し、型安全なユーザー情報が返却される
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  // 型安全性の検証: dataがUser型として推論される
  expect(result.current.data).toBeDefined();
  expect(result.current.data?.id).toBe(userId);
  expect(result.current.data?.email).toBe('test@example.com');
  expect(result.current.data?.provider).toBe('google');
  expect(result.current.isLoading).toBe(false);
  expect(result.current.error).toBeNull();
});

test('ユーザーが存在しない場合にエラーをthrowする', async () => {
  // Given: 404エラーレスポンスを返す設定
  const userId = 'nonexistent-uuid';

  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );

  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  // When: useUserフックを呼び出し（存在しないユーザーID）
  const { result } = renderHook(() => useUser(userId), { wrapper });

  // Then: React Queryのerror状態になり、エラーメッセージが返却される
  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(result.current.data).toBeUndefined();
  expect(result.current.error).toBeDefined();
  expect(result.current.error?.message).toContain('ユーザー');
});

test('ネットワークエラー時に適切にエラーハンドリングする', async () => {
  // Given: ネットワークエラーをシミュレート
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  mockFetch.mockRejectedValue(new Error('Network error'));

  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  // When: useUserフックを呼び出し（ネットワークエラー発生）
  const { result } = renderHook(() => useUser(userId), { wrapper });

  // Then: React Queryのerror状態になる
  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(result.current.data).toBeUndefined();
  expect(result.current.error).toBeDefined();
});
