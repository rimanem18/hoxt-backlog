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
import { useUpdateNotificationSetting } from '../hooks/useUpdateNotificationSetting';

const mockProjectId = '770e8400-e29b-41d4-a716-446655440001';

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

function renderUpdateNotificationSetting() {
  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useUpdateNotificationSetting(), { wrapper });
}

describe('useUpdateNotificationSetting', () => {
  test('正常系 - 通知設定変更が成功しproject一覧キャッシュが無効化される', async () => {
    // Given: モックAPIが200を返し、キャッシュ無効化をスパイできる
    const invalidateSpy = mock(() => Promise.resolve());
    queryClient.invalidateQueries = invalidateSpy;

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            projectId: mockProjectId,
            notificationEnabled: false,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderUpdateNotificationSetting();

    // When: 通知設定をOFFに変更
    result.current.mutate({ projectId: mockProjectId, enabled: false });

    // Then: 更新が成功し、viewer project一覧のキャッシュが無効化される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['viewer-accessible-projects'],
      }),
    );
  });

  test('異常系 - 有効な招待が存在しない場合（404）のエラーが伝播する', async () => {
    // Given: モックAPIがViewerNotFoundErrorを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VIEWER_NOT_FOUND',
            message: '有効な招待が見つかりません',
          },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderUpdateNotificationSetting();

    // When: 通知設定を変更
    result.current.mutate({ projectId: mockProjectId, enabled: true });

    // Then: エラーメッセージがそのまま伝播する
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('有効な招待が見つかりません');
  });

  test('異常系 - ネットワークエラー時に統一メッセージへ変換される', async () => {
    // Given: モックfetchがネットワークエラーをthrow
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderUpdateNotificationSetting();

    // When: 通知設定を変更
    result.current.mutate({ projectId: mockProjectId, enabled: true });

    // Then: エラーが統一メッセージに変換される
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(
      '通信エラーが発生しました。再試行してください',
    );
  });
});
