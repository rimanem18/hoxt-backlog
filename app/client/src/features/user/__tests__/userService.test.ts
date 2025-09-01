import { afterEach, beforeEach, describe, expect, test, mock } from 'bun:test';
import type { User } from '@/packages/shared-schemas/src/auth';
import { userService } from '../services/userService';

// fetch APIのモック
const mockFetch = mock();
global.fetch = mockFetch;

// localStorageのステートフルモック作成
const createLocalStorageMock = () => {
  let store: { [key: string]: string } = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
};

// globalオブジェクトにlocalStorageを定義
const localStorageMock = createLocalStorageMock();
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('userService API連携レイヤー', () => {
  beforeEach(() => {
    // 【テスト前準備】: fetchモックの初期化とJWT設定
    // 【環境初期化】: 各テストで独立したHTTPリクエスト環境を構築
    mockFetch.mockReset();
    localStorage.clear();
    
    // JWTトークンをlocal storageに設定（認証前提）
    localStorage.setItem('authToken', 'mock-jwt-token');
  });

  afterEach(() => {
    // 【テスト後処理】: グローバルモックのクリーンアップ
    // 【状態復元】: 次テストへのHTTP状態汚染を防止
  });

  test('getUserProfile API正常実行時のユーザー情報取得', async () => {
    // 【テスト目的】: API正常系の通信処理確認
    // 【テスト内容】: GET /api/user/profile成功時のUser型データ取得
    // 【期待される動作】: 認証ヘッダー付きリクエスト送信とレスポンス解析
    // 🟢 既存API実装パターン（TASK-301）からの高信頼性

    // 【テストデータ準備】: プロダクション環境相当のUser型APIレスポンス
    // 【初期条件設定】: 正常な200ステータスでのJSONレスポンス
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-09-01T10:30:00.000Z'
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: mock().mockResolvedValue(mockUser),
    });

    // 【実際の処理実行】: userService.getUserProfile実行
    // 【処理内容】: API通信とレスポンス処理の確認
    const result = await userService.getUserProfile();

    // 【結果検証】: API通信の正確性とレスポンス解析確認
    // 【期待値確認】: 適切なHTTPヘッダーとエンドポイント通信
    expect(mockFetch).toHaveBeenCalledWith('/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token',
      },
    }); // 【確認内容】: 適切なAPI エンドポイント・認証ヘッダーでの通信確認 🟢

    expect(result).toEqual(mockUser); // 【確認内容】: 取得したUser型データが正確であること 🟢
  });

  test('getUserProfile 401認証エラー時の適切なエラーハンドリング', async () => {
    // 【テスト目的】: 認証エラー時の適切な例外処理確認
    // 【テスト内容】: JWT有効期限切れまたは無効トークン時のエラー処理
    // 【期待される動作】: 401ステータス検知と認証エラー例外発生
    // 🟢 既存認証実装パターン（TASK-301）からの高信頼性

    // 【テストデータ準備】: JWT認証失敗レスポンスをシミュレート
    // 【初期条件設定】: 401 Unauthorized レスポンス
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: mock().mockResolvedValue({ 
        error: 'Invalid or expired token' 
      }),
    });

    // 【実際の処理実行】: userService.getUserProfile認証エラー実行
    // 【処理内容】: 認証エラーレスポンス処理の確認
    
    // 【結果検証】: 認証エラーの適切な例外発生確認
    // 【期待値確認】: セキュリティエラーの適切な伝播
    await expect(userService.getUserProfile()).rejects.toThrow(); // 【確認内容】: 401エラー時に適切に例外が発生すること 🟢
    
    expect(mockFetch).toHaveBeenCalledWith('/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token',
      },
    }); // 【確認内容】: 認証エラー時でも適切なリクエストが送信されること 🟢
  });

  test('getUserProfile 500サーバーエラー時のエラーハンドリング', async () => {
    // 【テスト目的】: サーバーエラー時の適切な例外処理確認
    // 【テスト内容】: バックエンドサーバー障害時のエラー処理
    // 【期待される動作】: 500ステータス検知とサーバーエラー例外発生
    // 🟡 一般的なHTTPエラーパターンからの妥当な推測

    // 【テストデータ準備】: サーバー内部エラーレスポンスをシミュレート
    // 【初期条件設定】: 500 Internal Server Error レスポンス
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: mock().mockResolvedValue({ 
        error: 'Database connection failed' 
      }),
    });

    // 【実際の処理実行】: userService.getUserProfileサーバーエラー実行
    // 【処理内容】: サーバーエラーレスポンス処理の確認
    
    // 【結果検証】: サーバーエラーの適切な例外発生確認
    // 【期待値確認】: システムエラーの適切な伝播
    await expect(userService.getUserProfile()).rejects.toThrow(); // 【確認内容】: 500エラー時に適切に例外が発生すること 🟡
    
    expect(mockFetch).toHaveBeenCalledTimes(1); // 【確認内容】: サーバーエラー時でもリクエストが1回送信されること 🟡
  });

  test('getUserProfile ネットワークエラー時のエラーハンドリング', async () => {
    // 【テスト目的】: ネットワーク障害時の適切な例外処理確認
    // 【テスト内容】: インターネット接続断絶、DNS解決失敗時のエラー処理
    // 【期待される動作】: ネットワークエラー検知と通信エラー例外発生
    // 🟡 一般的なネットワークエラーパターンからの妥当な推測

    // 【テストデータ準備】: ネットワーク接続失敗をシミュレート
    // 【初期条件設定】: fetch実行時のネットワーク例外発生
    mockFetch.mockRejectedValue(new Error('Network Error'));

    // 【実際の処理実行】: userService.getUserProfileネットワークエラー実行
    // 【処理内容】: ネットワーク例外処理の確認
    
    // 【結果検証】: ネットワークエラーの適切な例外発生確認
    // 【期待値確認】: 通信障害エラーの適切な伝播
    await expect(userService.getUserProfile()).rejects.toThrow('Network Error'); // 【確認内容】: ネットワークエラー時に適切に例外が発生すること 🟡
    
    expect(mockFetch).toHaveBeenCalledTimes(1); // 【確認内容】: ネットワークエラー時でもfetchが1回呼び出されること 🟡
  });

  test('getUserProfile JWTトークン未存在時のエラーハンドリング', async () => {
    // 【テスト目的】: 認証トークン未設定時の適切なエラー処理確認
    // 【テスト内容】: localStorage にJWTトークンが存在しない場合のエラー処理
    // 【期待される動作】: トークン未存在検知と認証エラー例外発生
    // 🟢 既存認証実装パターン（TASK-301）からの高信頼性

    // 【テストデータ準備】: JWTトークン未存在状態をシミュレート
    // 【初期条件設定】: localStorage からトークンを削除してnull状態にする
    localStorage.removeItem('authToken');

    // 【実際の処理実行】: userService.getUserProfile トークン未存在実行
    // 【処理内容】: 認証トークン検証処理の確認
    
    // 【結果検証】: 認証トークン未存在の適切なエラー発生確認
    // 【期待値確認】: 認証前提処理での適切な事前チェック
    await expect(userService.getUserProfile()).rejects.toThrow(); // 【確認内容】: JWTトークン未存在時に適切に例外が発生すること 🟢
    
    expect(mockFetch).not.toHaveBeenCalled(); // 【確認内容】: トークン未存在時はAPIリクエストが送信されないこと 🟢
  });
});