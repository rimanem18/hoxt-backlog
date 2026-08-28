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
import { useInviteViewer } from '../hooks/useInviteViewer';

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

function renderInviteViewer() {
  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useInviteViewer(), { wrapper });
}

describe('useInviteViewer', () => {
  test('正常系 - viewer招待が成功しviewer一覧キャッシュが再取得される', async () => {
    // Given: モックAPIが正常にProjectViewerを返し、一覧クエリのキャッシュが存在する
    const invalidateSpy = mock(() => Promise.resolve());
    queryClient.invalidateQueries = invalidateSpy;

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '550e8400-e29b-41d4-a716-446655440099',
            projectId: mockProjectId,
            email: 'viewer@example.com',
            status: 'active',
            invitedAt: '2026-01-01T00:00:00.000Z',
            revokedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderInviteViewer();

    // When: inviteViewerを実行
    result.current.mutate({
      projectId: mockProjectId,
      email: 'viewer@example.com',
    });

    // Then: 招待が成功し、viewer一覧のキャッシュが無効化される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.email).toBe('viewer@example.com');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['project-viewers', mockProjectId],
      }),
    );
  });

  test('異常系 - 自己招待エラー（400）がErrorとしてthrowされる', async () => {
    // Given: モックAPIが自己招待エラーを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '自分自身を招待できません',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderInviteViewer();

    // When: inviteViewerを実行
    result.current.mutate({
      projectId: mockProjectId,
      email: 'owner@example.com',
    });

    // Then: エラーメッセージがそのままthrowされる
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('自分自身を招待できません');
  });

  test('異常系 - メール送信失敗エラー（502）がErrorとしてthrowされる', async () => {
    // Given: モックAPIがメール送信失敗エラーを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MAIL_DELIVERY_FAILED',
            message: '招待メールの送信に失敗しました: SES error',
          },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderInviteViewer();

    // When: inviteViewerを実行
    result.current.mutate({
      projectId: mockProjectId,
      email: 'viewer@example.com',
    });

    // Then: エラーメッセージがそのままthrowされる
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(
      '招待メールの送信に失敗しました: SES error',
    );
  });
});
