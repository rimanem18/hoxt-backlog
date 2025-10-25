import { afterEach, beforeEach, expect, type Mock, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import { useUpdateUser } from './useUpdateUser';

// DI方式のモックfetch
type MockFetch = Mock<[input: Request], Promise<Response>>;
let mockFetch: MockFetch;
let queryClient: QueryClient;

beforeEach(() => {
  mockFetch = mock();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
});

afterEach(() => {
  queryClient.clear();
  mock.restore();
  mock.clearAllMocks();
});

test('React QueryフックuseUpdateUserがキャッシュを適切に無効化する', async () => {
  // Given: 初期データをキャッシュに設定（useUserのキャッシュをシミュレート）
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const initialUser = {
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

  // useUserのキャッシュキーに初期データを設定（mutation後の無効化を検証するため）
  queryClient.setQueryData(['users', userId], initialUser);

  const updateData = {
    name: 'Updated Name',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  const mockUpdatedUser = {
    ...initialUser,
    name: 'Updated Name',
    avatarUrl: 'https://example.com/avatar.jpg',
    updatedAt: '2025-01-25T01:00:00Z',
  };

  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        data: mockUpdatedUser,
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

  // When: useUpdateUserフックを呼び出し、mutateを実行
  const { result } = renderHook(() => useUpdateUser(), { wrapper });

  await act(async () => {
    result.current.mutate({
      userId,
      data: updateData,
    });
  });

  // Then: mutation成功後、更新データが返却され、キャッシュが無効化される
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  // 更新データが正しく返却される
  expect(result.current.data).toBeDefined();
  expect(result.current.data?.name).toBe('Updated Name');
  expect(result.current.data?.avatarUrl).toBe('https://example.com/avatar.jpg');

  // キャッシュが無効化されたことを確認（staleになっている）
  const queryState = queryClient.getQueryState(['users', userId]);
  expect(queryState?.isInvalidated).toBe(true);
});

test('ユーザー更新時にエラーが発生した場合に適切に処理される', async () => {
  // Given: エラーレスポンスを返す設定
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const updateData = {
    name: 'Updated Name',
  };

  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
        },
      }),
      {
        status: 400,
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

  // When: useUpdateUserフックを呼び出し、mutateを実行（エラー発生）
  const { result } = renderHook(() => useUpdateUser(), { wrapper });

  await act(async () => {
    result.current.mutate({
      userId,
      data: updateData,
    });
  });

  // Then: React Queryのerror状態になり、エラーメッセージが返却される
  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(result.current.data).toBeUndefined();
  expect(result.current.error).toBeDefined();
  expect(result.current.error?.message).toContain('バリデーション');
});
