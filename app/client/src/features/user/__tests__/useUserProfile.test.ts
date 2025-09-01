import { afterEach, beforeEach, describe, expect, test, mock } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/packages/shared-schemas/src/auth';
import { useUserProfile } from '../hooks/useUserProfile';

// まだ実装されていないuserServiceのモック
const mockUserService = mock();

mock.module('../services/userService', () => ({
  userService: {
    getUserProfile: mockUserService,
  }
}));

describe('useUserProfile フック', () => {
  beforeEach(() => {
    // 【テスト前準備】: フックの状態をクリーンにリセット
    // 【環境初期化】: モック関数の呼び出し履歴をクリア
    mockUserService.mockReset();
  });

  afterEach(() => {
    // 【テスト後処理】: 非同期処理のクリーンアップ
    // 【状態復元】: 次テストへの副作用を防止
  });

  test('初期状態でローディング中になる', () => {
    // 【テスト目的】: フック初期化時の状態確認
    // 【テスト内容】: useUserProfile呼び出し直後のloading状態検証
    // 【期待される動作】: 初期状態でloading: true、データなし、エラーなし
    // 🟡 一般的なReact Hooksパターンからの妥当な推測

    // 【テストデータ準備】: APIコール前の初期状態をシミュレート
    // 【初期条件設定】: まだAPIレスポンスを受け取っていない状態
    mockUserService.mockImplementation(() => new Promise(() => {})); // 永続的にpending

    // 【実際の処理実行】: useUserProfileフックの初期化
    // 【処理内容】: フック呼び出しとAPI通信開始
    const { result } = renderHook(() => useUserProfile());

    // 【結果検証】: 初期状態の正確性確認
    // 【期待値確認】: ローディング表示による適切なUX提供
    expect(result.current.loading).toBe(true); // 【確認内容】: 初期状態でローディング中であること 🟡
    expect(result.current.user).toBe(null); // 【確認内容】: 初期状態でユーザーデータがnullであること 🟡
    expect(result.current.error).toBe(null); // 【確認内容】: 初期状態でエラーがnullであること 🟡
    expect(typeof result.current.refetch).toBe('function'); // 【確認内容】: refetch関数が提供されていること 🟡
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

    mockUserService.mockResolvedValue(mockUser);

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
    expect(mockUserService).toHaveBeenCalledTimes(1); // 【確認内容】: userServiceが1回呼び出されること 🟢
  });

  test('API失敗時にエラー状態を正常設定', async () => {
    // 【テスト目的】: エラーハンドリングの適切性確認
    // 【テスト内容】: userService.getUserProfile失敗時の状態遷移
    // 【期待される動作】: loading終了、エラー情報設定、ユーザーデータクリア
    // 🟡 一般的なAPI エラーパターンからの妥当な推測

    // 【テストデータ準備】: API エラーレスポンスをシミュレート
    // 【初期条件設定】: サーバーエラー（500）発生時の状態
    const mockError = new Error('プロフィール情報の取得に失敗しました');
    mockUserService.mockRejectedValue(mockError);

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
    expect(mockUserService).toHaveBeenCalledTimes(1); // 【確認内容】: userServiceが1回呼び出されること 🟡
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

    mockUserService
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(mockUser);

    // 【実際の処理実行】: useUserProfileフックのrefetch機能実行
    // 【処理内容】: エラー発生後の再試行処理確認
    const { result } = renderHook(() => useUserProfile());

    // 初回エラー確認
    await waitFor(() => {
      expect(result.current.error).toBeTruthy(); // 【確認内容】: 初回API呼び出しでエラー発生確認 🟡
    });

    // refetch実行
    await result.current.refetch();

    // 【結果検証】: refetch後の状態回復確認
    // 【期待値確認】: 再試行によるエラー回復とデータ取得
    await waitFor(() => {
      expect(result.current.loading).toBe(false); // 【確認内容】: refetch完了後のローディング終了 🟡
    });

    expect(result.current.user).toEqual(mockUser); // 【確認内容】: refetch成功でユーザーデータが設定されること 🟡
    expect(result.current.error).toBe(null); // 【確認内容】: refetch成功でエラーがクリアされること 🟡
    expect(mockUserService).toHaveBeenCalledTimes(2); // 【確認内容】: userServiceが2回（初回+refetch）呼び出されること 🟡
  });
});