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
import { useRevokeViewer } from '../hooks/useRevokeViewer';

const mockProjectId = '770e8400-e29b-41d4-a716-446655440002';
const mockViewerId = '550e8400-e29b-41d4-a716-446655440001';

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

function renderRevokeViewer() {
  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useRevokeViewer(), { wrapper });
}

describe('useRevokeViewer', () => {
  test('正常系 - viewer取り消しが成功しviewer一覧キャッシュが再取得される', async () => {
    // Given: モックAPIが204を返し、一覧クエリのキャッシュが存在する
    const invalidateSpy = mock(() => Promise.resolve());
    queryClient.invalidateQueries = invalidateSpy;

    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

    const { result } = renderRevokeViewer();

    // When: revokeViewerを実行
    result.current.mutate({
      projectId: mockProjectId,
      viewerId: mockViewerId,
    });

    // Then: 取り消しが成功し、viewer一覧のキャッシュが無効化される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['project-viewers', mockProjectId],
      }),
    );
  });

  test('異常系 - 取り消し対象が存在しない場合（404）がErrorとしてthrowされる', async () => {
    // Given: モックAPIがViewerNotFoundErrorを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VIEWER_NOT_FOUND',
            message: `招待が見つかりません: ${mockViewerId}`,
          },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderRevokeViewer();

    // When: revokeViewerを実行
    result.current.mutate({
      projectId: mockProjectId,
      viewerId: mockViewerId,
    });

    // Then: エラーメッセージがそのままthrowされる
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(
      `招待が見つかりません: ${mockViewerId}`,
    );
  });
});
