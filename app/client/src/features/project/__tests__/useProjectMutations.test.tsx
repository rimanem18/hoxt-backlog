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
import { useProjectMutations } from '../hooks/useProjectMutations';

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

function renderMutations() {
  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useProjectMutations(), { wrapper });
}

describe('useProjectMutations', () => {
  test('正常系 - project作成が成功し一覧キャッシュが再取得される', async () => {
    // Given: モックAPIが正常にprojectを返し、一覧クエリのキャッシュが存在する
    const invalidateSpy = mock(() => Promise.resolve());
    queryClient.invalidateQueries = invalidateSpy;

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            userId: 'user-id',
            name: 'プロジェクトA',
            description: null,
            createdAt: '2025-01-25T00:00:00Z',
            updatedAt: '2025-01-25T00:00:00Z',
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { result } = renderMutations();

    // When: createProjectを実行
    result.current.createProject.mutate({ name: 'プロジェクトA' });

    // Then: 作成が成功し、project一覧のキャッシュが無効化される
    await waitFor(() =>
      expect(result.current.createProject.isSuccess).toBe(true),
    );

    expect(result.current.createProject.data?.name).toBe('プロジェクトA');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['projects'] }),
    );
  });

  test('異常系 - バリデーションエラー（400）がErrorとしてthrowされる', async () => {
    // Given: モックAPIがバリデーションエラーを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'プロジェクト名を入力してください',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { result } = renderMutations();

    // When: createProjectを実行
    result.current.createProject.mutate({ name: '' });

    // Then: エラーメッセージがそのままthrowされる
    await waitFor(() =>
      expect(result.current.createProject.isError).toBe(true),
    );

    expect(result.current.createProject.error?.message).toBe(
      'プロジェクト名を入力してください',
    );
  });

  test('正常系 - project更新（名称のみ）が成功しキャッシュが再取得される', async () => {
    // Given: モックAPIが正常に更新後のprojectを返す
    const invalidateSpy = mock(() => Promise.resolve());
    queryClient.invalidateQueries = invalidateSpy;

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            userId: 'user-id',
            name: '更新後のプロジェクト名',
            description: '説明A',
            createdAt: '2025-01-25T00:00:00Z',
            updatedAt: '2025-01-26T00:00:00Z',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { result } = renderMutations();

    // When: updateProjectを実行
    result.current.updateProject.mutate({
      id: '550e8400-e29b-41d4-a716-446655440001',
      input: { name: '更新後のプロジェクト名' },
    });

    // Then: 更新が成功し、project一覧・詳細のキャッシュが無効化される
    await waitFor(() =>
      expect(result.current.updateProject.isSuccess).toBe(true),
    );

    expect(result.current.updateProject.data?.name).toBe(
      '更新後のプロジェクト名',
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['projects'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['project', '550e8400-e29b-41d4-a716-446655440001'],
      }),
    );
  });

  test('正常系 - project更新（説明文のみ）が成功する', async () => {
    // Given: モックAPIが正常に更新後のprojectを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            userId: 'user-id',
            name: 'プロジェクトA',
            description: '更新後の説明',
            createdAt: '2025-01-25T00:00:00Z',
            updatedAt: '2025-01-26T00:00:00Z',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { result } = renderMutations();

    // When: updateProjectを実行
    result.current.updateProject.mutate({
      id: '550e8400-e29b-41d4-a716-446655440001',
      input: { description: '更新後の説明' },
    });

    // Then: 更新が成功する
    await waitFor(() =>
      expect(result.current.updateProject.isSuccess).toBe(true),
    );

    expect(result.current.updateProject.data?.description).toBe('更新後の説明');
  });

  test('異常系 - バリデーションエラー（400）がErrorとしてthrowされる', async () => {
    // Given: モックAPIがバリデーションエラーを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_PROJECT_DATA',
            message: 'プロジェクト名は100文字以内で入力してください',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { result } = renderMutations();

    // When: updateProjectを実行
    result.current.updateProject.mutate({
      id: '550e8400-e29b-41d4-a716-446655440001',
      input: { name: 'a'.repeat(101) },
    });

    // Then: エラーメッセージがそのままthrowされる
    await waitFor(() =>
      expect(result.current.updateProject.isError).toBe(true),
    );

    expect(result.current.updateProject.error?.message).toBe(
      'プロジェクト名は100文字以内で入力してください',
    );
  });

  test('異常系 - 404がErrorとしてthrowされる', async () => {
    // Given: モックAPIがPROJECT_NOT_FOUNDエラーを返す
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'プロジェクトが見つかりません: nonexistent-id',
          },
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { result } = renderMutations();

    // When: updateProjectを実行
    result.current.updateProject.mutate({
      id: 'nonexistent-id',
      input: { name: '更新後の名前' },
    });

    // Then: エラーとしてthrowされる
    await waitFor(() =>
      expect(result.current.updateProject.isError).toBe(true),
    );

    expect(result.current.updateProject.error).toBeDefined();
  });
});
