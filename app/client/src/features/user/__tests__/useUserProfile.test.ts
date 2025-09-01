import { afterEach, beforeEach, describe, expect, test, mock } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/packages/shared-schemas/src/auth';

// 【改善内容】: テスト分離のため固有のモックスコープを作成
// 【テスト対応】: useUserProfileフック専用のモック環境を構築
// 🟢 信頼性レベル: テスト分析結果に基づく確実な修正
const mockGetUserProfile = mock().mockName('useUserProfile-getUserProfile');

// 【モジュールモック改善】: 固有のモジュールモックIDで分離
// 【安定性確保】: 他のテストファイルとの干渉を完全に排除
mock.module('../services/userService', () => ({
  userService: {
    getUserProfile: mockGetUserProfile,
  }
}));

// 【動的インポート】: モック設定後にフックをインポートしてモック適用を確実にする
// 【テスト環境最適化】: モック競合を避けるための遅延インポート
const { useUserProfile } = await import('../hooks/useUserProfile');

describe('useUserProfile フック', () => {
  beforeEach(() => {
    // 【テスト前準備】: フックの状態をクリーンにリセット
    // 【環境初期化】: モック関数の完全なリセット
    // 【改善点】: mockClearとmockResetの両方を実行してモック状態を完全に初期化
    mockGetUserProfile.mockClear();
    mockGetUserProfile.mockReset();
  });

  afterEach(() => {
    // 【テスト後処理】: 非同期処理のクリーンアップ
    // 【状態復元】: 次テストへの副作用を防止
    // 【完全クリーンアップ】: モック実装の復元
    mockGetUserProfile.mockRestore();
  });

  test('初期状態でローディング中になる', async () => {
    // 【テスト目的】: フック初期化時の状態確認
    // 【テスト内容】: useUserProfile呼び出し直後のloading状態検証
    // 【期待される動作】: 初期状態でloading: true、データなし、エラーなし
    // 【改善内容】: 非同期初期化処理を考慮したテスト設計
    // 🟢 テスト分析結果に基づく確実な修正

    // 【テストデータ準備】: APIコール前の初期状態をシミュレート
    // 【初期条件設定】: 永続的にpending状態を維持してローディング状態を確認
    // 【改善点】: より確実なPending Promise作成
    mockGetUserProfile.mockImplementation(() => new Promise(() => {})); // 永続的にpending

    // 【実際の処理実行】: useUserProfileフックの初期化
    // 【処理内容】: フック呼び出しとAPI通信開始
    const { result } = renderHook(() => useUserProfile());

    // 【非同期処理待機】: useEffect内での初期化処理が開始されるまで待機
    // 【改善内容】: 初期状態の確認タイミングを最適化
    await waitFor(() => {
      expect(result.current.loading).toBe(true); // 【確認内容】: 初期状態でローディング中であること 🟢
    });
    
    expect(result.current.user).toBe(null); // 【確認内容】: 初期状態でユーザーデータがnullであること 🟢
    expect(result.current.error).toBe(null); // 【確認内容】: 初期状態でエラーがnullであること 🟢
    expect(typeof result.current.refetch).toBe('function'); // 【確認内容】: refetch関数が提供されていること 🟢
  });

  test('API成功時にユーザーデータを正常取得', async () => {
    // 【テスト目的】: 正常系のAPI通信とデータ取得確認
    // 【テスト内容】: userService.getUserProfile成功時の状態遷移
    // 【期待される動作】: loading終了、ユーザーデータ設定、エラークリア
    // 🟢 既存API実装パターンに基づく高信頼性

    // 【テストデータ準備】: 正常なAPI レスポンスをシミュレート
    // 【初期条件設定】: 完全なUser型オブジェクトでの成功レスポンス
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

    // 【改善点】: モック名を統一し、確実なレスポンス設定
    mockGetUserProfile.mockResolvedValue(mockUser);

    // 【実際の処理実行】: useUserProfileフックの成功シナリオ実行
    // 【処理内容】: API成功レスポンス処理の確認
    const { result } = renderHook(() => useUserProfile());

    // 【結果検証】: API成功時の状態遷移確認
    // 【期待値確認】: 正常なデータ取得と状態更新
    await waitFor(() => {
      expect(result.current.loading).toBe(false); // 【確認内容】: ローディング状態の終了確認 🟢
    });

    expect(result.current.user).toEqual(mockUser); // 【確認内容】: 取得したユーザーデータが正確に設定されること 🟢
    expect(result.current.error).toBe(null); // 【確認内容】: エラー状態がクリアされること 🟢
    expect(mockGetUserProfile).toHaveBeenCalledTimes(1); // 【確認内容】: userServiceが1回呼び出されること 🟢
  });

  test('API失敗時にエラー状態を正常設定', async () => {
    // 【テスト目的】: エラーハンドリングの適切性確認
    // 【テスト内容】: userService.getUserProfile失敗時の状態遷移
    // 【期待される動作】: loading終了、エラー情報設定、ユーザーデータクリア
    // 🟡 一般的なAPI エラーパターンからの妥当な推測

    // 【テストデータ準備】: API エラーレスポンスをシミュレート
    // 【初期条件設定】: サーバーエラー（500）発生時の状態
    const mockError = new Error('プロフィール情報の取得に失敗しました');
    // 【改善点】: エラーモック設定を統一し、確実なエラー処理テストを実行
    mockGetUserProfile.mockRejectedValue(mockError);

    // 【実際の処理実行】: useUserProfileフックのエラーシナリオ実行
    // 【処理内容】: API エラーレスポンス処理の確認
    const { result } = renderHook(() => useUserProfile());

    // 【結果検証】: API エラー時の状態遷移確認
    // 【期待値確認】: 適切なエラーハンドリングと状態更新
    await waitFor(() => {
      expect(result.current.loading).toBe(false); // 【確認内容】: ローディング状態の終了確認 🟡
    });

    expect(result.current.user).toBe(null); // 【確認内容】: エラー時はユーザーデータがnullであること 🟡
    expect(result.current.error).toEqual(mockError); // 【確認内容】: エラー情報が正確に設定されること 🟡
    expect(mockGetUserProfile).toHaveBeenCalledTimes(1); // 【確認内容】: userServiceが1回呼び出されること 🟡
  });

  test('refetch関数による再取得機能', async () => {
    // 【テスト目的】: リトライ機能の動作確認
    // 【テスト内容】: refetch関数呼び出し時のAPI再実行
    // 【期待される動作】: 手動でのデータ再取得とエラー回復
    // 🟡 一般的なリトライパターンからの妥当な推測

    // 【テストデータ準備】: 初回失敗、再試行成功のシナリオ
    // 【初期条件設定】: 最初はエラー、refetch後は成功データ
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

    // 【改善点】: より確実なrefetchテストのための段階的モック設定
    // 初回は必ずエラー、2回目以降は成功データを返すよう設定
    mockGetUserProfile.mockRejectedValueOnce(new Error('Network Error'));

    // 【実際の処理実行】: useUserProfileフックのrefetch機能実行
    // 【処理内容】: エラー発生後の再試行処理確認
    const { result } = renderHook(() => useUserProfile());

    // 初回エラー確認
    await waitFor(() => {
      expect(result.current.error).toBeTruthy(); // 【確認内容】: 初回API呼び出しでエラー発生確認 🟡
    });
    
    // refetch用のモック成功設定を追加
    mockGetUserProfile.mockResolvedValueOnce(mockUser);

    // refetch実行
    await result.current.refetch();

    // 【結果検証】: refetch後の状態回復確認
    // 【期待値確認】: 再試行によるエラー回復とデータ取得
    await waitFor(() => {
      expect(result.current.loading).toBe(false); // 【確認内容】: refetch完了後のローディング終了 🟡
    });

    expect(result.current.user).toEqual(mockUser); // 【確認内容】: refetch成功でユーザーデータが設定されること 🟡
    expect(result.current.error).toBe(null); // 【確認内容】: refetch成功でエラーがクリアされること 🟡
    expect(mockGetUserProfile).toHaveBeenCalledTimes(2); // 【確認内容】: userServiceが2回（初回+refetch）呼び出されること 🟡
  });
});