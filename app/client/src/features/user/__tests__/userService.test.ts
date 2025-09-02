import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { User } from '@/packages/shared-schemas/src/auth';
import { createUserService, type TokenService } from '../services/userService';

// 【グローバルモック強化】: fetch APIの完全分離モック
// 【テスト環境制御】: userService専用のfetchモック環境を構築
// 【干渉防止】: 他のテストファイルのfetchモックとの競合を排除
// 🟢 信頼性レベル: グローバルモック汚染問題の根本解決
const mockFetch = mock().mockName('userService-fetch-isolated');

// 【グローバル環境制御】: テストファイル固有のfetch環境を確立
// 【モック分離戦略】: 他テストとの状態共有を完全に排除
const originalFetch = global.fetch;
global.fetch = mockFetch;

// 【TokenServiceモック】: リファクタリング後の依存性注入に対応
// 【テスト戦略】: TokenServiceの抽象化を利用したテスト容易性向上
// 🟢 改善点: 依存性注入による高度なテスタビリティを活用
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
    // 【テスト前準備】: fetchモックの完全な初期化とJWT設定
    // 【環境初期化】: 各テストで独立したHTTPリクエスト環境を構築
    // 【グローバル環境再設定】: 他のテストの影響を排除するためfetchを再設定
    mockFetch.mockClear();
    mockFetch.mockReset();

    // 【グローバルfetch再設定】: 他テストとの干渉を防ぐため毎回設定
    global.fetch = mockFetch;

    // 【TokenServiceモック初期化】: リファクタリング後の依存性注入対応
    mockTokenService = createMockTokenService();
    // JWTトークンをTokenServiceに設定（認証前提）
    mockTokenService.setToken('mock-jwt-token');

    // 【userService初期化】: モック化されたTokenServiceを注入
    userService = createUserService(mockTokenService);
  });

  afterEach(() => {
    // 【テスト後処理】: グローバルモックの完全クリーンアップ
    // 【状態復元】: 次テストへのHTTP状態汚染を防止
    // 【グローバル環境復元】: 原状復帰による他テストへの影響排除
    // 🟢 改善点: グローバル状態の確実な復元処理を追加
    mockFetch.mockRestore();

    // 【グローバル状態復元】: fetch環境を元の状態に戻して他テストへの影響を排除
    if (originalFetch) {
      global.fetch = originalFetch;
    }
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
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };

    // 【fetch結果モック】: 正常なHTTPレスポンスをシミュレート
    // 【改善点】: 完全なResponse型オブジェクトを模倣してテスト安定性を向上
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: mock().mockResolvedValue(mockUser),
      statusText: 'OK',
      headers: new Headers(),
    } as Response);

    // 【実際の処理実行】: userService.getUserProfile実行
    // 【処理内容】: API通信とレスポンス処理の確認
    const result = await userService.getUserProfile();

    // 【結果検証】: API通信の正確性とレスポンス解析確認
    // 【期待値確認】: 適切なHTTPヘッダーとエンドポイント通信
    expect(mockFetch).toHaveBeenCalledWith('/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token',
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
    // 【認証エラーレスポンス】: 401 Unauthorized状態のモック
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: mock().mockResolvedValue({
        error: 'Invalid or expired token',
      }),
      headers: new Headers(),
    } as Response);

    // 【実際の処理実行】: userService.getUserProfile認証エラー実行
    // 【処理内容】: 認証エラーレスポンス処理の確認

    // 【結果検証】: 認証エラーの適切な例外発生確認
    // 【期待値確認】: セキュリティエラーの適切な伝播
    await expect(userService.getUserProfile()).rejects.toThrow(); // 【確認内容】: 401エラー時に適切に例外が発生すること 🟢

    expect(mockFetch).toHaveBeenCalledWith('/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token',
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
    // 【サーバーエラーレスポンス】: 500 Internal Server Error状態のモック
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: mock().mockResolvedValue({
        error: 'Database connection failed',
      }),
      headers: new Headers(),
    } as Response);

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
    await expect(userService.getUserProfile()).rejects.toThrow(
      'インターネット接続を確認してください',
    ); // 【確認内容】: ネットワークエラー時に適切に例外が発生すること 🟡

    expect(mockFetch).toHaveBeenCalledTimes(1); // 【確認内容】: ネットワークエラー時でもfetchが1回呼び出されること 🟡
  });

  test('getUserProfile JWTトークン未存在時のエラーハンドリング', async () => {
    // 【テスト目的】: 認証トークン未設定時の適切なエラー処理確認
    // 【テスト内容】: TokenService にJWTトークンが存在しない場合のエラー処理
    // 【期待される動作】: トークン未存在検知と認証エラー例外発生
    // 🟢 既存認証実装パターン（TASK-301）からの高信頼性

    // 【テストデータ準備】: JWTトークン未存在状態をシミュレート
    // 【初期条件設定】: TokenServiceからトークンを削除してnull状態にする
    mockTokenService.removeToken();

    // 【実際の処理実行】: userService.getUserProfile トークン未存在実行
    // 【処理内容】: 認証トークン検証処理の確認

    // 【結果検証】: 認証トークン未存在の適切なエラー発生確認
    // 【期待値確認】: 認証前提処理での適切な事前チェック
    await expect(userService.getUserProfile()).rejects.toThrow(); // 【確認内容】: JWTトークン未存在時に適切に例外が発生すること 🟢

    expect(mockFetch).not.toHaveBeenCalled(); // 【確認内容】: トークン未存在時はAPIリクエストが送信されないこと 🟢
  });
});
