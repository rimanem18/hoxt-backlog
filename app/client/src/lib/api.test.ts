import { afterEach, beforeEach, expect, type Mock, mock, test } from 'bun:test';
import { apiClient, createApiClient } from './api';

// テスト用のベースURL（環境変数から取得）
const TEST_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// DI方式のモックfetch（全テストで使用）
type MockFetch = Mock<[input: Request], Promise<Response>>;
let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = mock();
});

afterEach(() => {
  mock.restore();
  mock.clearAllMocks();
});

test('APIクライアント初期化が正しく動作する', () => {
  // Given: APIクライアント初期化パラメータ
  const headers = { Authorization: 'Bearer test-token' };

  // When: createApiClient関数を呼び出してクライアント生成
  const client = createApiClient(TEST_BASE_URL, headers, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  // Then: クライアントインスタンスが正常に生成される
  expect(client).toBeDefined();
  expect(client.GET).toBeDefined();
  expect(client.POST).toBeDefined();
  expect(client.PUT).toBeDefined();
  expect(client.DELETE).toBeDefined();
});

test('デフォルトのapiClientが環境変数から初期化される', () => {
  // Given: 環境変数が設定されている（デフォルトはlocalhost:3001）

  // Then: apiClientが正しく初期化されている
  expect(apiClient).toBeDefined();
  expect(apiClient.GET).toBeDefined();
  expect(apiClient.POST).toBeDefined();
  expect(apiClient.PUT).toBeDefined();
  expect(apiClient.DELETE).toBeDefined();
});

test('GETメソッドで型安全にユーザー情報を取得できる', async () => {
  // Given: モックfetchで成功レスポンスを返す設定
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUser = {
    id: userId,
    externalId: '1234567890',
    provider: 'google' as const,
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null,
  };

  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        data: mockUser,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );

  // When: GETメソッドでユーザー情報を取得
  const client = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });
  const { data, error } = await client.GET('/users/{id}', {
    params: { path: { id: userId } },
  });

  // Then: 型安全なレスポンスが返却される
  expect(error).toBeUndefined();
  expect(data).toEqual({
    success: true,
    data: mockUser,
  });

  // mockFetchが正しく呼ばれたことを検証
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const request = mockFetch.mock.calls[0][0];
  expect(request.method).toBe('GET');
  expect(request.url).toBe(`${TEST_BASE_URL}/users/${userId}`);

  // 型安全性の検証: dataの各フィールドが正しい型として推論される
  expect(data?.data.id).toBe(userId);
  expect(data?.data.email).toBe('test@example.com');
  expect(data?.data.provider).toBe('google');
});

test('PUTメソッドで型安全にユーザー情報を更新できる', async () => {
  // Given: モックfetchで更新成功レスポンスを返す設定
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const updateData = {
    name: 'Updated Name',
    avatarUrl: 'https://example.com/avatar.jpg',
  };
  const mockUpdatedUser = {
    id: userId,
    externalId: '1234567890',
    provider: 'google' as const,
    email: 'test@example.com',
    name: 'Updated Name',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T01:00:00Z',
    lastLoginAt: null,
  };

  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        data: mockUpdatedUser,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );

  // When: PUTメソッドでユーザー情報を更新
  const client = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });
  const { data, error } = await client.PUT('/users/{id}', {
    params: { path: { id: userId } },
    body: updateData,
  });

  // Then: 更新後のユーザー情報が型安全に返却される
  expect(error).toBeUndefined();
  expect(data).toEqual({
    success: true,
    data: mockUpdatedUser,
  });

  // mockFetchが正しく呼ばれたことを検証
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const request = mockFetch.mock.calls[0][0];
  expect(request.method).toBe('PUT');
  expect(request.url).toBe(`${TEST_BASE_URL}/users/${userId}`);

  // リクエストボディが正しく送信されたことを検証
  const requestBody = await request.clone().json();
  expect(requestBody).toEqual(updateData);

  // 型安全性の検証: 更新されたフィールドが正しい値として推論される
  expect(data?.data.name).toBe('Updated Name');
  expect(data?.data.avatarUrl).toBe('https://example.com/avatar.jpg');
  expect(data?.data.updatedAt).toBe('2025-01-25T01:00:00Z');
});
