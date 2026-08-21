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
import { useViewerAccessibleProjects } from '../hooks/useViewerAccessibleProjects';

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

function renderViewerAccessibleProjects() {
  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useViewerAccessibleProjects(), { wrapper });
}

describe('useViewerAccessibleProjects', () => {
  test('正常系 - 複数projectのtask一覧が取得される', async () => {
    // Given: モックAPIが複数projectのtaskを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            projects: [
              {
                projectId: '770e8400-e29b-41d4-a716-446655440001',
                projectName: 'project A',
                tasks: [
                  {
                    id: '880e8400-e29b-41d4-a716-446655440001',
                    title: 'task A1',
                    description: 'desc A1',
                    status: 'not_started',
                    priority: 'high',
                  },
                ],
              },
              {
                projectId: '770e8400-e29b-41d4-a716-446655440002',
                projectName: 'project B',
                tasks: [],
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    // When: useViewerAccessibleProjectsを呼び出し
    const { result } = renderViewerAccessibleProjects();

    // Then: 2件のprojectが返却される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.[0].projectName).toBe('project A');
    expect(result.current.data?.[0].tasks[0].title).toBe('task A1');
  });

  test('正常系 - 招待0件の場合は空配列が返る', async () => {
    // Given: モックAPIが空配列を返す（全招待取り消し後の状態）
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { projects: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // When: useViewerAccessibleProjectsを呼び出し
    const { result } = renderViewerAccessibleProjects();

    // Then: 空配列が返却される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  test('異常系 - 無効なトークンの場合はエラーメッセージが伝播する', async () => {
    // Given: モックAPIが401（無効なトークン）を返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_VIEWER_ACCESS_TOKEN',
            message: '無効なViewer-Access-Tokenです',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    // When: useViewerAccessibleProjectsを呼び出し
    const { result } = renderViewerAccessibleProjects();

    // Then: サーバーのエラーメッセージがそのまま伝播する
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('無効なViewer-Access-Tokenです');
  });

  test('エラー系 - ネットワークエラー', async () => {
    // Given: モックfetchがネットワークエラーをthrow
    mockFetch.mockRejectedValue(new Error('Network error'));

    // When: useViewerAccessibleProjectsを呼び出し
    const { result } = renderViewerAccessibleProjects();

    // Then: エラーが統一メッセージに変換される
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(
      '通信エラーが発生しました。再試行してください',
    );
  });
});
