import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  mock,
  test,
} from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import type { Task } from '@/packages/shared-schemas/src/tasks';
import taskReducer from '../../store/taskSlice';
import { useTasks } from '../useTasks';

// DI方式のモックfetch
type MockFetch = Mock<[input: Request], Promise<Response>>;
let mockFetch: MockFetch;
let queryClient: QueryClient;
let store: ReturnType<typeof configureStore>;

beforeEach(() => {
  mockFetch = mock();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  store = configureStore({
    reducer: {
      task: taskReducer,
    },
  });
});

afterEach(() => {
  queryClient.clear();
  mock.restore();
  mock.clearAllMocks();
});

describe('useTasks', () => {
  test('正常系 - タスク一覧取得成功', async () => {
    // Given: モックAPIが正常にタスク一覧を返す
    const mockTasks: Task[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        title: 'テストタスク1',
        description: 'テスト説明1',
        priority: 'high',
        status: 'not_started',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T00:00:00Z',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        userId: 'user-id',
        title: 'テストタスク2',
        description: 'テスト説明2',
        priority: 'medium',
        status: 'in_progress',
        createdAt: '2025-01-25T01:00:00Z',
        updatedAt: '2025-01-25T01:00:00Z',
      },
    ];

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: mockTasks,
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
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );

    // When: useTasks を呼び出し
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Then: 非同期処理が完了し、タスク一覧が返却される
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.[0].id).toBe(
      '550e8400-e29b-41d4-a716-446655440001',
    );
    expect(result.current.data?.[0].title).toBe('テストタスク1');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('正常系 - 優先度フィルタ適用', async () => {
    // Given: Redux状態で優先度フィルタ「高」が選択されている
    const mockTasks: Task[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        title: '高優先度タスク',
        description: null,
        priority: 'high',
        status: 'not_started',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T00:00:00Z',
      },
    ];

    let requestUrl = '';
    mockFetch.mockImplementation(async (request: Request) => {
      requestUrl = request.url;
      return new Response(
        JSON.stringify({
          success: true,
          data: mockTasks,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const mockClient = createApiClient('http://localhost:3001/api', undefined, {
      fetch: mockFetch as unknown as typeof fetch,
    });

    // Redux状態に優先度フィルタを設定
    const storeWithFilter = configureStore({
      reducer: {
        task: taskReducer,
      },
      preloadedState: {
        task: {
          filters: {
            priority: 'high',
            status: [],
          },
          sort: {
            sortBy: 'created_at_desc',
          },
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={storeWithFilter}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );

    // When: useTasks を呼び出し（フィルタ「高」が設定済み）
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Then: APIクエリに priority=high が含まれる
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(requestUrl).toContain('priority=high');
  });

  test('正常系 - ソート適用', async () => {
    // Given: Redux状態でソート順「作成日時昇順」が選択されている
    const mockTasks: Task[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        title: 'タスク1',
        description: null,
        priority: 'medium',
        status: 'not_started',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T00:00:00Z',
      },
    ];

    let requestUrl = '';
    mockFetch.mockImplementation(async (request: Request) => {
      requestUrl = request.url;
      return new Response(
        JSON.stringify({
          success: true,
          data: mockTasks,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const mockClient = createApiClient('http://localhost:3001/api', undefined, {
      fetch: mockFetch as unknown as typeof fetch,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );

    // When: useTasks を呼び出し
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Then: APIクエリに sort が含まれる
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(requestUrl).toContain('sort=');
  });

  test('正常系 - 複数ステータスフィルタ適用', async () => {
    // Given: Redux状態で複数ステータスフィルタが選択されている
    const mockTasks: Task[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        title: 'タスク1',
        description: null,
        priority: 'medium',
        status: 'in_progress',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T00:00:00Z',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        userId: 'user-id',
        title: 'タスク2',
        description: null,
        priority: 'medium',
        status: 'in_review',
        createdAt: '2025-01-25T01:00:00Z',
        updatedAt: '2025-01-25T01:00:00Z',
      },
    ];

    let requestUrl = '';
    mockFetch.mockImplementation(async (request: Request) => {
      requestUrl = request.url;
      return new Response(
        JSON.stringify({
          success: true,
          data: mockTasks,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const mockClient = createApiClient('http://localhost:3001/api', undefined, {
      fetch: mockFetch as unknown as typeof fetch,
    });

    // Redux状態に複数ステータスフィルタを設定
    const storeWithStatusFilter = configureStore({
      reducer: {
        task: taskReducer,
      },
      preloadedState: {
        task: {
          filters: {
            priority: 'all',
            status: ['in_progress', 'in_review'],
          },
          sort: {
            sortBy: 'created_at_desc',
          },
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={storeWithStatusFilter}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );

    // When: useTasks を呼び出し（複数ステータスフィルタが設定済み）
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Then: APIクエリに status=in_progress,in_review が含まれる
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    // status配列がカンマ区切りに変換されている
    expect(requestUrl).toContain('status=in_progress%2Cin_review');
  });

  test('エラー系 - ネットワークエラー', async () => {
    // Given: モックfetchがネットワークエラーをthrow
    mockFetch.mockRejectedValue(new Error('Network error'));

    const mockClient = createApiClient('http://localhost:3001/api', undefined, {
      fetch: mockFetch as unknown as typeof fetch,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );

    // When: useTasks を呼び出し
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Then: エラーが統一メッセージに変換される
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe(
      '通信エラーが発生しました。再試行してください',
    );
  });

  test('エラー系 - 認証エラー（401）', async () => {
    // Given: モックAPIが401エラーを返す
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
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );

    // When: useTasks を呼び出し
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Then: エラーが発生する
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('認証');
  });

  test('エラー系 - アクセス権限エラー（403）', async () => {
    // Given: モックAPIが403エラーを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const mockClient = createApiClient('http://localhost:3001/api', undefined, {
      fetch: mockFetch as unknown as typeof fetch,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );

    // When: useTasks を呼び出し
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Then: エラーが発生する
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('アクセス権限がありません');
  });
});
