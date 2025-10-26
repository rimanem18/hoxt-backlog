import { afterEach, beforeEach, expect, type Mock, mock, test } from 'bun:test';
import { apiClient, createApiClient } from './api';

// テスト用のベースURL（環境変数から取得、/apiプレフィックス含む）
const TEST_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

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
  // T010: nullフィールド境界値テスト - avatarUrl, lastLoginAtがnullの場合を検証
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUser = {
    id: userId,
    externalId: '1234567890',
    provider: 'google' as const,
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null, // T010: nullableフィールドの境界値
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null, // T010: nullableフィールドの境界値
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

  // T010: nullフィールド境界値検証 - nullable型が正しく推論される
  expect(data?.data.avatarUrl).toBeNull();
  expect(data?.data.lastLoginAt).toBeNull();
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

test('404エラー時に適切なエラーレスポンスを返す', async () => {
  // Given: モックfetchで404エラーレスポンスを返す設定
  const nonexistentId = 'nonexistent-uuid';
  const mockErrorResponse = {
    success: false,
    error: {
      code: 'USER_NOT_FOUND',
      message: 'ユーザーが見つかりません',
    },
  };

  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(mockErrorResponse), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  // When: 存在しないユーザーIDでGETリクエスト送信
  const client = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });
  const { data, error } = await client.GET('/users/{id}', {
    params: { path: { id: nonexistentId } },
  });

  // Then: 404エラーが正しく返却される
  expect(data).toBeUndefined();
  expect(error).toBeDefined();
  expect(error?.success).toBe(false);
  expect(error?.error.code).toBe('USER_NOT_FOUND');
  expect(error?.error.message).toBe('ユーザーが見つかりません');

  // mockFetchが正しく呼ばれたことを検証
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const request = mockFetch.mock.calls[0][0];
  expect(request.method).toBe('GET');
  expect(request.url).toBe(`${TEST_BASE_URL}/users/${nonexistentId}`);
});

test('ネットワークエラー時に適切にエラーハンドリングする', async () => {
  // Given: モックfetchでネットワークエラー（reject）を返す設定
  const networkError = new Error('Network error');
  mockFetch.mockRejectedValue(networkError);

  // When: ネットワークエラー発生状態でGETリクエスト送信
  const client = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  // Then: openapi-fetchがエラーを投げる
  try {
    await client.GET('/users/{id}', {
      params: { path: { id: '550e8400-e29b-41d4-a716-446655440000' } },
    });
    // エラーが投げられなかった場合、テスト失敗
    expect(true).toBe(false);
  } catch (error) {
    // ネットワークエラーが正しく投げられたことを検証
    expect(error).toBeDefined();
    expect(error).toBe(networkError);
  }

  // mockFetchが正しく呼ばれたことを検証
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test('公開エンドポイントは認証トークンなしでアクセスできる', async () => {
  // Given: モックfetchで認証コールバック成功レスポンスを返す設定
  const mockAuthResponse = {
    success: true,
    data: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google-user-123',
      provider: 'google' as const,
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      createdAt: '2025-01-25T00:00:00Z',
      updatedAt: '2025-01-25T00:00:00Z',
      lastLoginAt: '2025-01-25T00:00:00Z',
    },
  };

  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(mockAuthResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  // When: 認証トークンなしでPOST /auth/callbackを実行
  const client = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });
  const { data, error } = await client.POST('/auth/callback', {
    body: {
      externalId: 'google-user-123',
      provider: 'google',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
    },
  });

  // Then: 認証トークンなしでも正常にレスポンスが返却される
  expect(error).toBeUndefined();
  expect(data).toEqual(mockAuthResponse);

  // mockFetchが正しく呼ばれたことを検証
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const request = mockFetch.mock.calls[0][0];
  expect(request.method).toBe('POST');
  expect(request.url).toBe(`${TEST_BASE_URL}/auth/callback`);

  // Authorizationヘッダーが設定されていないことを検証
  expect(request.headers.get('Authorization')).toBeNull();

  // 型安全性の検証: dataの各フィールドが正しい型として推論される
  expect(data?.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  expect(data?.data.provider).toBe('google');
});
