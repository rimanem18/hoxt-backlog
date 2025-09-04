import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { User } from '@/packages/shared-schemas/src/auth';
import { createUserService, type TokenService } from '../services/userService';

// userService専用のfetch API モック
const mockFetch = mock().mockName('userService-fetch-isolated');

// グローバルfetch環境の制御
const originalFetch = global.fetch;
global.fetch = mockFetch;

// TokenServiceのモックファクトリー関数
const createMockTokenService = (): TokenService => {
  let token: string | null = null;

  return {
    getToken: mock()
      .mockImplementation(() => token)
      .mockName('mockTokenService-getToken'),
    setToken: mock()
      .mockImplementation((newToken: string) => {
        token = newToken;
      })
      .mockName('mockTokenService-setToken'),
    removeToken: mock()
      .mockImplementation(() => {
        token = null;
      })
      .mockName('mockTokenService-removeToken'),
    isTokenValid: mock()
      .mockImplementation(() => token !== null)
      .mockName('mockTokenService-isTokenValid'),
  };
};

let mockTokenService: TokenService;
let userService: ReturnType<typeof createUserService>;

describe('userService API連携レイヤー', () => {
  beforeEach(() => {
    // fetchモックの初期化
    mockFetch.mockClear();
    mockFetch.mockReset();
    global.fetch = mockFetch;

    // TokenServiceモックの初期化
    mockTokenService = createMockTokenService();
    mockTokenService.setToken('mock-jwt-token');

    // userServiceの初期化
    userService = createUserService(mockTokenService);
  });

  afterEach(() => {
    // グローバルモックのクリーンアップ
    mockFetch.mockRestore();
    if (originalFetch) {
      global.fetch = originalFetch;
    }
  });

  test('getUserProfile API正常実行時のユーザー情報取得', async () => {
    // Given: 正常なUser型APIレスポンスデータ
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };

    // 正常なHTTPレスポンスをモック
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: mock().mockResolvedValue(mockUser),
      statusText: 'OK',
      headers: new Headers(),
    } as Response);

    // When: userService.getUserProfileを実行
    const result = await userService.getUserProfile();

    // Then: 適切なAPIリクエストが送信され正しいデータが取得される
    expect(mockFetch).toHaveBeenCalledWith('/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token',
      },
    });
    expect(result).toEqual(mockUser);
  });

  test('getUserProfile 401認証エラー時の適切なエラーハンドリング', async () => {
    // Given: 401認証エラーレスポンス
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: mock().mockResolvedValue({
        error: 'Invalid or expired token',
      }),
      headers: new Headers(),
    } as Response);

    // When/Then: userService.getUserProfile実行で例外が発生
    await expect(userService.getUserProfile()).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledWith('/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token',
      },
    });
  });

  test('getUserProfile 500サーバーエラー時のエラーハンドリング', async () => {
    // Given: 500サーバーエラーレスポンス
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: mock().mockResolvedValue({
        error: 'Database connection failed',
      }),
      headers: new Headers(),
    } as Response);

    // When/Then: userService.getUserProfile実行で例外が発生
    await expect(userService.getUserProfile()).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('getUserProfile ネットワークエラー時のエラーハンドリング', async () => {
    // Given: ネットワークエラーが発生
    mockFetch.mockRejectedValue(new Error('Network Error'));

    // When/Then: 特定のエラーメッセージで例外が発生
    await expect(userService.getUserProfile()).rejects.toThrow(
      'インターネット接続を確認してください',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('getUserProfile JWTトークン未存在時のエラーハンドリング', async () => {
    // Given: JWTトークンが未設定
    mockTokenService.removeToken();

    // When/Then: トークン未存在で例外が発生しAPIリクエストは送信されない
    await expect(userService.getUserProfile()).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
