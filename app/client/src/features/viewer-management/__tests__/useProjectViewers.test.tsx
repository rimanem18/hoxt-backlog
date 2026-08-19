import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  mock,
  test,
} from 'bun:test';
import type { ProjectViewer } from '@hoxt-backlog/shared-schemas/viewers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import { useProjectViewers } from '../hooks/useProjectViewers';

const mockProjectId = '770e8400-e29b-41d4-a716-446655440002';

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

function renderProjectViewers(options?: { enabled?: boolean }) {
  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useProjectViewers(mockProjectId, options), {
    wrapper,
  });
}

describe('useProjectViewers', () => {
  test('正常系 - viewer一覧取得成功', async () => {
    // Given: モックAPIが正常にviewer一覧を返す
    const mockViewers: ProjectViewer[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        projectId: mockProjectId,
        email: 'a@example.com',
        status: 'active',
        invitedAt: '2026-01-01T00:00:00.000Z',
        revokedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        projectId: mockProjectId,
        email: 'b@example.com',
        status: 'active',
        invitedAt: '2026-01-02T00:00:00.000Z',
        revokedAt: null,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ];

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: mockViewers }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // When: useProjectViewersを呼び出し
    const { result } = renderProjectViewers();

    // Then: viewer一覧が返却される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.[0].email).toBe('a@example.com');
  });

  test('正常系 - viewer0件の場合は空配列が返る', async () => {
    // Given: モックAPIが空配列を返す（全招待取り消し後の状態）
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // When: useProjectViewersを呼び出し
    const { result } = renderProjectViewers();

    // Then: 空配列が返却される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  test('enabled: falseの場合はクエリが実行されない', () => {
    // Given: enabled: falseを指定
    const { result } = renderProjectViewers({ enabled: false });

    // Then: fetchが呼ばれずローディングにならない
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  test('エラー系 - ネットワークエラー', async () => {
    // Given: モックfetchがネットワークエラーをthrow
    mockFetch.mockRejectedValue(new Error('Network error'));

    // When: useProjectViewersを呼び出し
    const { result } = renderProjectViewers();

    // Then: エラーが統一メッセージに変換される
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(
      '通信エラーが発生しました。再試行してください',
    );
  });

  test('エラー系 - APIエラーレスポンス（他ユーザーのproject）', async () => {
    // Given: モックAPIが404を返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    // When: useProjectViewersを呼び出し
    const { result } = renderProjectViewers();

    // Then: エラーが発生する
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('見つかりません');
  });
});
