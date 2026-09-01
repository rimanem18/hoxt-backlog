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
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import ViewerTaskBoard from '../components/ViewerTaskBoard';

/**
 * ViewerTaskBoard（デフォルトエクスポート）の配線テスト
 *
 * propsのtokenからViewer-Access-Tokenヘッダを持つAPIクライアントが
 * 実際に組み立てられ、ViewerServicesProvider配下のViewerTaskBoardContentへ
 * 正しく供給されることを確認する。ViewerTaskBoardContent単体のテストでは
 * Context DIでhookごと差し替えるため、この配線自体は検証対象外だった。
 */

type MockFetch = Mock<[input: Request], Promise<Response>>;
let mockFetch: MockFetch;
let originalFetch: typeof fetch;
let queryClient: QueryClient;

beforeEach(() => {
  mockFetch = mock();
  originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as unknown as typeof fetch;
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
  globalThis.fetch = originalFetch;
  queryClient.clear();
  mock.restore();
  mock.clearAllMocks();
});

describe('ViewerTaskBoard', () => {
  test('propsのtokenがViewer-Access-Tokenヘッダとして送信される', async () => {
    // Given: モックAPIが空のproject一覧を返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { viewerEmail: 'viewer@example.com', projects: [] },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    // When: token propを指定してレンダリング
    render(
      <QueryClientProvider client={queryClient}>
        <ViewerTaskBoard token="test-token-abc" />
      </QueryClientProvider>,
    );

    // Then: 実際のリクエストにViewer-Access-Tokenヘッダが載る
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const request = mockFetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('Viewer-Access-Token')).toBe('test-token-abc');

    // Then: 実際のuseViewerAccessibleProjectsフックが動作し空状態が表示される
    await screen.findByText('閲覧できるprojectがありません');
  });
});
