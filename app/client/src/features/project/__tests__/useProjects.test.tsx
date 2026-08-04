import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  mock,
  test,
} from 'bun:test';
import type { Project } from '@hoxt-backlog/shared-schemas/projects';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import { useProjects } from '../hooks/useProjects';

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
    },
  });
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  mock.restore();
  mock.clearAllMocks();
});

describe('useProjects', () => {
  test('正常系 - project一覧取得成功', async () => {
    // Given: モックAPIが正常にproject一覧を返す
    const mockProjects: Project[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        name: 'プロジェクトA',
        description: '説明A',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T00:00:00Z',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        userId: 'user-id',
        name: 'プロジェクトB',
        description: null,
        createdAt: '2025-01-25T01:00:00Z',
        updatedAt: '2025-01-25T01:00:00Z',
      },
    ];

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: mockProjects,
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

    // When: useProjects を呼び出し
    const { result } = renderHook(() => useProjects(), { wrapper });

    // Then: 非同期処理が完了し、project一覧が返却される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.[0].name).toBe('プロジェクトA');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('正常系 - project0件の場合は空配列が返る', async () => {
    // Given: モックAPIが空配列を返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [],
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

    // When: useProjects を呼び出し
    const { result } = renderHook(() => useProjects(), { wrapper });

    // Then: 空配列が返却される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  test('エラー系 - ネットワークエラー', async () => {
    // Given: モックfetchがネットワークエラーをthrow
    mockFetch.mockRejectedValue(new Error('Network error'));

    const mockClient = createApiClient('http://localhost:3001/api', undefined, {
      fetch: mockFetch as unknown as typeof fetch,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );

    // When: useProjects を呼び出し
    const { result } = renderHook(() => useProjects(), { wrapper });

    // Then: エラーが統一メッセージに変換される
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe(
      '通信エラーが発生しました。再試行してください',
    );
  });

  test('エラー系 - APIエラーレスポンス', async () => {
    // Given: モックAPIがエラーレスポンスを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        }),
        {
          status: 401,
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

    // When: useProjects を呼び出し
    const { result } = renderHook(() => useProjects(), { wrapper });

    // Then: エラーが発生する
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('認証');
  });
});
