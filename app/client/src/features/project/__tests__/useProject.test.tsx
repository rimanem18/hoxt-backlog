import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  mock,
  test,
} from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import { useProject } from '../hooks/useProject';

const mockProjectId = '550e8400-e29b-41d4-a716-446655440001';

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

function renderUseProject(projectId: string) {
  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useProject(projectId), { wrapper });
}

describe('useProject', () => {
  test('正常系 - project詳細取得成功', async () => {
    // Given: モックAPIが正常にproject詳細を返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: mockProjectId,
            userId: 'user-id',
            name: 'プロジェクトA',
            description: '説明A',
            createdAt: '2025-01-25T00:00:00Z',
            updatedAt: '2025-01-25T00:00:00Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    // When: useProject を呼び出し
    const { result } = renderUseProject(mockProjectId);

    // Then: project詳細が返却される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe('プロジェクトA');
    expect(result.current.error).toBeNull();
  });

  test('異常系 - 404の場合は見つからない旨の統一メッセージになる', async () => {
    // Given: モックAPIがPROJECT_NOT_FOUNDエラーを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: `プロジェクトが見つかりません: ${mockProjectId}`,
          },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    // When: useProject を呼び出し
    const { result } = renderUseProject(mockProjectId);

    // Then: 権限有無を明かさない統一メッセージのエラーになる
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('プロジェクトが見つかりません');
  });

  test('異常系 - その他のAPIエラー', async () => {
    // Given: モックAPIが認証エラーを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    // When: useProject を呼び出し
    const { result } = renderUseProject(mockProjectId);

    // Then: サーバーのエラーメッセージがそのまま伝わる
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('認証');
  });
});
