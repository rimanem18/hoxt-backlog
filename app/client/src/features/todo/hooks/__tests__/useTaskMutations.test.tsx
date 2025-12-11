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
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import type { Task } from '@/packages/shared-schemas/src/tasks';
import taskReducer from '../../store/taskSlice';
import { useTaskMutations } from '../useTaskMutations';

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
      mutations: {
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

describe('useTaskMutations', () => {
  describe('createTask', () => {
    test('正常系 - タスク作成成功', async () => {
      // Given: モックAPIが正常にタスクを作成
      const mockTask: Task = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        title: 'テストタスク',
        description: null,
        priority: 'high',
        status: 'not_started',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T00:00:00Z',
      };

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: mockTask,
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: createTask.mutate を実行
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.createTask.mutate({
          title: 'テストタスク',
          priority: 'high',
        });
      });

      // Then: mutation成功後、タスクが返却される
      await waitFor(() =>
        expect(result.current.createTask.isSuccess).toBe(true),
      );

      expect(result.current.createTask.data).toBeDefined();
      expect(result.current.createTask.data?.id).toBe(
        '550e8400-e29b-41d4-a716-446655440001',
      );
      expect(result.current.createTask.data?.title).toBe('テストタスク');
      expect(result.current.createTask.data?.priority).toBe('high');
    });

    test('デフォルト優先度テスト', async () => {
      // Given: モックAPIが正常にタスクを作成（priorityなし）
      const mockTask: Task = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        title: 'テストタスク',
        description: null,
        priority: 'medium',
        status: 'not_started',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T00:00:00Z',
      };

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: mockTask,
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: createTask.mutate を実行（priorityなし）
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.createTask.mutate({
          title: 'テストタスク',
        });
      });

      // Then: デフォルト優先度「中」が設定される
      await waitFor(() =>
        expect(result.current.createTask.isSuccess).toBe(true),
      );

      expect(result.current.createTask.data).toBeDefined();
      expect(result.current.createTask.data?.priority).toBe('medium');
    });

    test('バリデーションエラー（空文字列）', async () => {
      // Given: モックAPIが400エラー（空文字列）を返す
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'タイトルを入力してください',
            },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: createTask.mutate を実行（空文字列）
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.createTask.mutate({ title: '' });
      });

      // Then: バリデーションエラーが返る
      await waitFor(() => expect(result.current.createTask.isError).toBe(true));

      expect(result.current.createTask.error).toBeDefined();
      expect(result.current.createTask.error?.message).toContain(
        'タイトルを入力してください',
      );
    });
  });

  describe('updateTask', () => {
    test('正常系 - タスク更新成功', async () => {
      // Given: モックAPIが正常にタスクを更新
      const mockTask: Task = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        title: '更新タスク',
        description: 'テスト説明',
        priority: 'medium',
        status: 'in_progress',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T01:00:00Z',
      };

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: mockTask,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: updateTask.mutate を実行
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.updateTask.mutate({
          id: '550e8400-e29b-41d4-a716-446655440001',
          input: { title: '更新タスク', status: 'in_progress' },
        });
      });

      // Then: mutation成功後、更新データが返却される
      await waitFor(() =>
        expect(result.current.updateTask.isSuccess).toBe(true),
      );

      expect(result.current.updateTask.data).toBeDefined();
      expect(result.current.updateTask.data?.title).toBe('更新タスク');
    });

    test('存在しないタスク（404）', async () => {
      // Given: モックAPIが404エラーを返す
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'タスクが見つかりません',
            },
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: updateTask.mutate を実行（存在しないID）
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.updateTask.mutate({
          id: 'nonexistent-uuid',
          input: { title: '更新' },
        });
      });

      // Then: エラーが発生する
      await waitFor(() => expect(result.current.updateTask.isError).toBe(true));

      expect(result.current.updateTask.error).toBeDefined();
      expect(result.current.updateTask.error?.message).toContain(
        'タスクが見つかりません',
      );
    });
  });

  describe('deleteTask', () => {
    test('正常系 - タスク削除成功', async () => {
      // Given: モックAPIが正常にタスクを削除
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 204,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: deleteTask.mutate を実行
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.deleteTask.mutate(
          '550e8400-e29b-41d4-a716-446655440001',
        );
      });

      // Then: mutation成功
      await waitFor(() =>
        expect(result.current.deleteTask.isSuccess).toBe(true),
      );

      expect(result.current.deleteTask.error).toBeNull();
    });

    test('存在しないタスク（404）', async () => {
      // Given: モックAPIが404エラーを返す
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'タスクが見つかりません',
            },
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: deleteTask.mutate を実行（存在しないID）
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.deleteTask.mutate('nonexistent-uuid');
      });

      // Then: エラーが発生する
      await waitFor(() => expect(result.current.deleteTask.isError).toBe(true));

      expect(result.current.deleteTask.error).toBeDefined();
      expect(result.current.deleteTask.error?.message).toContain(
        'タスクが見つかりません',
      );
    });
  });

  describe('changeStatus', () => {
    test('正常系 - ステータス変更成功', async () => {
      // Given: モックAPIが正常にステータスを変更
      const mockTask: Task = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-id',
        title: 'テストタスク',
        description: null,
        priority: 'high',
        status: 'in_progress',
        createdAt: '2025-01-25T00:00:00Z',
        updatedAt: '2025-01-25T01:00:00Z',
      };

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: mockTask,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: changeStatus.mutate を実行
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.changeStatus.mutate({
          id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'in_progress',
        });
      });

      // Then: mutation成功後、更新されたタスクが返却される
      await waitFor(() =>
        expect(result.current.changeStatus.isSuccess).toBe(true),
      );

      expect(result.current.changeStatus.data).toBeDefined();
      expect(result.current.changeStatus.data?.status).toBe('in_progress');
    });

    test('不正なステータス値（400）', async () => {
      // Given: モックAPIが400エラー（不正なステータス）を返す
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

      const mockClient = createApiClient(
        'http://localhost:3001/api',
        undefined,
        {
          fetch: mockFetch as unknown as typeof fetch,
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={mockClient}>
              {children}
            </ApiClientProvider>
          </QueryClientProvider>
        </Provider>
      );

      // When: changeStatus.mutate を実行（不正なステータス）
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      await act(async () => {
        result.current.changeStatus.mutate({
          id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'invalid_status' as unknown as TaskStatus,
        });
      });

      // Then: エラーが発生する
      await waitFor(() =>
        expect(result.current.changeStatus.isError).toBe(true),
      );

      expect(result.current.changeStatus.error).toBeDefined();
      expect(result.current.changeStatus.error?.message).toContain(
        'バリデーション',
      );
    });
  });
});
