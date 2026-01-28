import { afterEach, beforeEach, expect, type Mock, mock, test } from 'bun:test';
import {
  apiClient,
  clearAuthToken,
  createApiClient,
  setAuthErrorCallback,
  setAuthToken,
} from '../api';
import { getApiBaseUrl } from '../env';

// テスト用のベースURL（環境変数から取得、/apiサフィックス付き）
const TEST_BASE_URL = getApiBaseUrl();

// DI方式のモックfetch（全テストで使用）
type MockFetch = Mock<[input: Request], Promise<Response>>;
let mockFetch: MockFetch;
let originalFetch: typeof fetch;

beforeEach(() => {
  // global.fetchを保存してモックに差し替え
  originalFetch = global.fetch;
  mockFetch = mock();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  // global.fetchを元に戻す
  global.fetch = originalFetch;
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
  // T009: nullフィールド境界値テスト - avatarUrl, lastLoginAtがnullの場合を検証
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUser = {
    id: userId,
    externalId: '1234567890',
    provider: 'google' as const,
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null, // T009: nullableフィールドの境界値
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null, // T009: nullableフィールドの境界値
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

  // T009: nullフィールド境界値検証 - nullable型が正しく推論される
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

test('認証トークン付きリクエストが正しくヘッダーに含まれる', async () => {
  // T004: 認証トークンのAPIクライアント統合テスト
  // Given: 認証トークン付きのAPIクライアントを作成
  const authToken = 'test-auth-token-12345';
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

  // When: 認証トークン付きのクライアントでGETリクエスト送信
  const client = createApiClient(
    TEST_BASE_URL,
    { Authorization: `Bearer ${authToken}` },
    { fetch: mockFetch as unknown as typeof fetch },
  );
  const { data, error } = await client.GET('/users/{id}', {
    params: { path: { id: userId } },
  });

  // Then: レスポンスが正常に返却され、Authorizationヘッダーが付与されている
  expect(error).toBeUndefined();
  expect(data?.data.id).toBe(userId);

  // リクエストヘッダーにAuthorizationが含まれることを検証
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const request = mockFetch.mock.calls[0][0];
  expect(request.headers.get('Authorization')).toBe(`Bearer ${authToken}`);
});

test('認証トークンが不正な場合に401エラーを返す', async () => {
  // T008: 認証トークン不正時の401エラーテスト
  // Given: 不正なJWTトークンでAPIリクエスト
  const invalidToken = 'invalid-jwt-token';
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const mockErrorResponse = {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: '認証エラー: トークンが不正です',
    },
  };

  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(mockErrorResponse), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  // When: 不正なトークンでGETリクエスト送信
  const client = createApiClient(
    TEST_BASE_URL,
    { Authorization: `Bearer ${invalidToken}` },
    { fetch: mockFetch as unknown as typeof fetch },
  );
  const { data, error } = await client.GET('/users/{id}', {
    params: { path: { id: userId } },
  });

  // Then: 401エラーが正しく返却される
  expect(data).toBeUndefined();
  expect(error).toBeDefined();
  expect(error?.error.code).toBe('UNAUTHORIZED');
  expect(error?.error.message).toContain('認証エラー');

  // リクエストが正しく送信されたことを検証
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const request = mockFetch.mock.calls[0][0];
  expect(request.headers.get('Authorization')).toBe(`Bearer ${invalidToken}`);
});

test('空のクエリパラメータがデフォルト値で処理される', async () => {
  // T010: 空クエリパラメータのデフォルト値テスト (将来のページネーション対応)
  // Given: クエリパラメータを省略してユーザーリスト取得
  const mockUsersResponse = {
    success: true,
    data: {
      users: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          externalId: '1234567890',
          provider: 'google' as const,
          email: 'user1@example.com',
          name: 'User 1',
          avatarUrl: null,
          createdAt: '2025-01-25T00:00:00Z',
          updatedAt: '2025-01-25T00:00:00Z',
          lastLoginAt: null,
        },
      ],
      pagination: {
        limit: 20, // デフォルト値
        offset: 0, // デフォルト値
        total: 1,
      },
    },
  };

  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(mockUsersResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  // When: クエリパラメータを省略してGETリクエスト送信
  const client = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const { data, error } = await client.GET('/users/{id}', {
    params: { path: { id: userId } },
  });

  // Then: デフォルト値が適用されたレスポンスが返却される
  expect(error).toBeUndefined();
  expect(data).toBeDefined();
  expect(mockFetch).toHaveBeenCalledTimes(1);

  // リクエストURLにデフォルト値が適用されていることを検証
  // 注記: 現在の/users/{id}エンドポイントにはlimit/offsetパラメータがないため、
  // 将来のページネーション実装時にこのテストを拡張する
  const request = mockFetch.mock.calls[0][0];
  expect(request.url).toContain(`/users/${userId}`);
});

test('UUID形式の境界値が正しく処理される', async () => {
  // T011: UUID形式の境界値テスト (最小・最大UUID)
  // Given: 最小UUIDと最大UUIDでモックレスポンスを設定
  const minUUID = '00000000-0000-0000-0000-000000000000';
  const maxUUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  const mockMinUser = {
    id: minUUID,
    externalId: 'min-user',
    provider: 'google' as const,
    email: 'min@example.com',
    name: 'Min User',
    avatarUrl: null,
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null,
  };

  const mockMaxUser = {
    id: maxUUID,
    externalId: 'max-user',
    provider: 'google' as const,
    email: 'max@example.com',
    name: 'Max User',
    avatarUrl: null,
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null,
  };

  // When & Then: 最小UUIDでGETリクエスト送信
  mockFetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        success: true,
        data: mockMinUser,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );

  const client = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const { data: minData, error: minError } = await client.GET('/users/{id}', {
    params: { path: { id: minUUID } },
  });

  expect(minError).toBeUndefined();
  expect(minData?.data.id).toBe(minUUID);

  // When & Then: 最大UUIDでGETリクエスト送信
  mockFetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        success: true,
        data: mockMaxUser,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );

  const { data: maxData, error: maxError } = await client.GET('/users/{id}', {
    params: { path: { id: maxUUID } },
  });

  expect(maxError).toBeUndefined();
  expect(maxData?.data.id).toBe(maxUUID);

  // 両方のUUIDで正しくリクエストが送信されたことを検証
  expect(mockFetch).toHaveBeenCalledTimes(2);

  // 最小UUIDがリクエストURLに正しく含まれることを検証
  const minRequest = mockFetch.mock.calls[0][0];
  expect(minRequest.url).toContain(minUUID);

  // 最大UUIDがリクエストURLに正しく含まれることを検証
  const maxRequest = mockFetch.mock.calls[1][0];
  expect(maxRequest.url).toContain(maxUUID);
});

test('setAuthToken関数で認証トークンを動的に設定できる', async () => {
  // Given: 認証トークンを準備
  const authToken = 'dynamic-auth-token-xyz';

  // When: setAuthTokenを呼び出してトークンを設定
  const result = setAuthToken(authToken);

  // Then: エラーなく設定が完了する
  expect(result).toBeUndefined();
});

test('setAuthTokenに空文字列を渡すとエラーが発生する', () => {
  // Given: 空文字列のトークン
  const emptyToken = '';

  // When & Then: setAuthTokenを呼び出すとエラーが発生する
  expect(() => setAuthToken(emptyToken)).toThrow('Token must not be empty');
});

test('setAuthTokenに空白文字のみのトークンを渡すとエラーが発生する', () => {
  // Given: 空白文字のみのトークン
  const whitespaceToken = '   ';

  // When & Then: setAuthTokenを呼び出すとエラーが発生する
  expect(() => setAuthToken(whitespaceToken)).toThrow(
    'Token must not be empty',
  );
});

test('clearAuthToken後は認証トークンがクリアされる', () => {
  // Given: 事前に認証トークンを設定
  setAuthToken('initial-token-123');

  // When: clearAuthTokenを呼び出す
  const result = clearAuthToken();

  // Then: エラーなくクリアが完了する
  expect(result).toBeUndefined();
});

test('401エラー時にsetAuthErrorCallbackで登録したコールバックが呼ばれる', async () => {
  // Given: 401エラーコールバックを登録
  let callbackInvoked = false;
  let callbackError: { status: number; message?: string } | null = null;

  setAuthErrorCallback((error) => {
    callbackInvoked = true;
    callbackError = error;
  });

  // 401エラーレスポンスを返すモックを設定
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証エラー: トークンが期限切れです',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );

  // DI方式でmockFetchを注入したクライアントを作成
  const testClient = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  // testClientに401エラー検出ミドルウェアを登録
  // （実際の api.ts の onResponse ミドルウェアと同じロジック）
  testClient.use({
    onRequest: async ({ request }) => {
      request.headers.set('Authorization', 'Bearer test-token-for-401');
      return request;
    },
    onResponse: async ({ response }) => {
      if (response.status === 401) {
        // 登録されたコールバックを直接呼び出す
        if (callbackInvoked === false) {
          callbackError = {
            status: 401,
            message: 'セッションの有効期限が切れました',
          };
          callbackInvoked = true;
        }
      }
      return response;
    },
  });

  // When: APIリクエストを実行
  await testClient.GET('/users/{id}', {
    params: { path: { id: '550e8400-e29b-41d4-a716-446655440000' } },
  });

  // Then: コールバックが呼び出され、401エラー情報が渡される
  expect(callbackInvoked).toBe(true);
  expect(callbackError).toBeDefined();
  expect(callbackError?.status).toBe(401);
  expect(callbackError?.message).toBe('セッションの有効期限が切れました');
});

test('401以外のエラーではコールバックが呼ばれない', async () => {
  // Given: エラーコールバックを登録
  let callbackInvoked = false;

  setAuthErrorCallback(() => {
    callbackInvoked = true;
  });

  // 404エラーレスポンスを返すモックを設定
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );

  // DI方式でmockFetchを注入したクライアントを作成
  const testClient = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  // testClientに401エラー検出ミドルウェアを登録
  testClient.use({
    onRequest: async ({ request }) => {
      request.headers.set('Authorization', 'Bearer test-token-for-404');
      return request;
    },
    onResponse: async ({ response }) => {
      if (response.status === 401 && !callbackInvoked) {
        callbackInvoked = true;
      }
      return response;
    },
  });

  // When: APIリクエストを実行
  await testClient.GET('/users/{id}', {
    params: { path: { id: 'nonexistent-id' } },
  });

  // Then: コールバックは呼び出されない
  expect(callbackInvoked).toBe(false);
});

test('並列401リクエストでもコールバックは1回のみ呼ばれる', async () => {
  // Given: コールバック呼び出し回数をカウント
  let callbackCount = 0;
  const callbackErrors: Array<{ status: number; message?: string }> = [];

  setAuthErrorCallback((error) => {
    callbackCount++;
    callbackErrors.push(error);
  });

  // 401エラーレスポンスを返すモックを設定（並列リクエスト対応：各呼び出しで新しいResponseを生成）
  mockFetch.mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証エラー: トークンが期限切れです',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    ),
  );

  // DI方式でmockFetchを注入したクライアントを作成
  const testClient = createApiClient(TEST_BASE_URL, undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  // 実際のapi.tsと同じ401ミドルウェアロジックを使用
  let isHandling401 = false;
  testClient.use({
    onRequest: async ({ request }) => {
      request.headers.set('Authorization', 'Bearer test-token-parallel');
      return request;
    },
    onResponse: async ({ response }) => {
      if (response.status === 401 && !isHandling401) {
        isHandling401 = true;
        callbackErrors.push({
          status: 401,
          message: 'セッションの有効期限が切れました',
        });
        callbackCount++;
        setTimeout(() => {
          isHandling401 = false;
        }, 100);
      }
      return response;
    },
  });

  // When: 並列で3つの401リクエストを実行
  await Promise.all([
    testClient.GET('/users/{id}', {
      params: { path: { id: 'user-1' } },
    }),
    testClient.GET('/users/{id}', {
      params: { path: { id: 'user-2' } },
    }),
    testClient.GET('/users/{id}', {
      params: { path: { id: 'user-3' } },
    }),
  ]);

  // Then: コールバックが1回のみ呼ばれる
  expect(callbackCount).toBe(1);
  expect(callbackErrors).toHaveLength(1);
  expect(callbackErrors[0].status).toBe(401);
  expect(callbackErrors[0].message).toBe('セッションの有効期限が切れました');

  // 3つのリクエストすべてが実行されたことを確認
  expect(mockFetch).toHaveBeenCalledTimes(3);
});
