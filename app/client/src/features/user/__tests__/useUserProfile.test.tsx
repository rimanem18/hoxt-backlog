import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { User } from '@/packages/shared-schemas/src/auth';

/**
 * 【テスト分離戦略】: 完全独立モック環境による確実な分離実装
 *
 * 問題分析:
 * - 他のテストファイルとのモック共有による干渉
 * - mock.module()の実行タイミングでの不整合
 * - グローバル状態での予期しない情報漏洩
 *
 * 解決策:
 * - テスト実行時間での動的モック制御
 * - 独立したUserServiceモック実装
 * - 完全な状態分離によるクリーンテスト
 */

/**
 * 【DI完全解決】: 依存性注入による確実なテスト分離実装
 *
 * 解決策:
 * - mock.module()を使用せず、DIパラメーターで直接モックを注入
 * - グローバル状態に依存しない完全独立テスト環境
 * - 他のテストファイルとの干渉を根本的に排除
 */

import { UserServiceProvider } from '../contexts/UserServiceContext';
// 【Context DI実装】: グローバル依存を完全排除したモジュールインポート
import { useUserProfile } from '../hooks/useUserProfile';
import type { UserServiceInterface } from '../services/userService';

// 【テストスコープ変数】: describe内で共有するtestUserService変数
let testUserService: UserServiceInterface;

describe('useUserProfile フック', () => {
  beforeEach(() => {
    // 【DI専用モック】: 依存性注入用の型安全なモックサービス
    // Bun の Mock 型を使った "型付きモックサービス"

    // 【DI環境構築】: 各テスト用の独立モックサービス作成
    // 【完全分離保証】: グローバル状態に一切依存しない独立環境
    const mockGetUserProfile = mock().mockName(
      `test-getUserProfile-${Date.now()}`,
    );

    testUserService = {
      getUserProfile: mockGetUserProfile,
    };
  });

  afterEach(() => {
    // 【DI環境クリア】: 次テストへの影響排除（DI環境では自動分離）
    // 【状態独立保証】: DIパターンによる自然な分離でクリーンアップ不要
  });

  test('初期状態でローディング中になる', async () => {
    // 【テスト目的】: フック初期化時の状態確認
    // 【テスト内容】: useUserProfile呼び出し直後のloading状態検証
    // 【期待される動作】: 初期状態でloading: true、データなし、エラーなし
    // 【改善内容】: 非同期初期化処理を考慮したテスト設計
    // 🟢 テスト分析結果に基づく確実な修正

    // 【DI分離データ】: 注入するモックサービスでの初期状態シミュレート
    // 【DI初期条件】: DIモックでのpending状態維持
    // 【DI完全制御】: 他テスト完全独立の確実なPending制御
    testUserService.getUserProfile.mockImplementation(
      () => new Promise(() => {}),
    ); // 永続的にpending

    // 【Context DI実行】: Context Provider経由でモックサービスを注入
    // 【完全分離実行】: グローバル依存ゼロでのフック呼び出し
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserServiceProvider value={testUserService}>
        {children}
      </UserServiceProvider>
    );

    const { result } = renderHook(() => useUserProfile(), { wrapper });

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
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };

    // 【DI改善実装】: DIモックでの確実なレスポンス設定
    testUserService.getUserProfile.mockResolvedValue(mockUser);

    // 【Context DI実行】: Context Provider経由でモックサービスを注入（成功ケース）
    // 【完全分離処理】: グローバル依存ゼロでのAPI成功レスポンス処理確認
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserServiceProvider value={testUserService}>
        {children}
      </UserServiceProvider>
    );

    const { result } = renderHook(() => useUserProfile(), { wrapper });

    // 【結果検証】: API成功時の状態遷移確認
    // 【期待値確認】: 正常なデータ取得と状態更新
    await waitFor(() => {
      expect(result.current.loading).toBe(false); // 【確認内容】: ローディング状態の終了確認 🟢
    });

    // console.log('実際の取得値:', JSON.stringify(result.current.user, null, 2));
    // console.log('期待値との一致:', JSON.stringify(mockUser) === JSON.stringify(result.current.user));
    expect(result.current.user).toEqual(mockUser); // 【確認内容】: 取得したユーザーデータが正確に設定されること 🟢
    expect(result.current.error).toBe(null); // 【確認内容】: エラー状態がクリアされること 🟢
    expect(testUserService.getUserProfile).toHaveBeenCalledTimes(1); // 【確認内容】: userServiceが1回呼び出されること 🟢
  });

  test('API失敗時にエラー状態を正常設定', async () => {
    // 【テスト目的】: エラーハンドリングの適切性確認
    // 【テスト内容】: userService.getUserProfile失敗時の状態遷移
    // 【期待される動作】: loading終了、エラー情報設定、ユーザーデータクリア
    // 🟡 一般的なAPI エラーパターンからの妥当な推測

    // 【テストデータ準備】: API エラーレスポンスをシミュレート
    // 【初期条件設定】: サーバーエラー（500）発生時の状態
    const mockError = new Error('プロフィール情報の取得に失敗しました');
    // 【DI改善実装】: DIモックでの確実なエラー処理テスト実行
    testUserService.getUserProfile.mockRejectedValue(mockError);

    // 【Context DI実行】: Context Provider経由でモックサービスを注入（エラーケース）
    // 【完全分離処理】: グローバル依存ゼロでのAPIエラーレスポンス処理確認
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserServiceProvider value={testUserService}>
        {children}
      </UserServiceProvider>
    );

    const { result } = renderHook(() => useUserProfile(), { wrapper });

    // 【結果検証】: API エラー時の状態遷移確認
    // 【期待値確認】: 適切なエラーハンドリングと状態更新
    await waitFor(() => {
      expect(result.current.loading).toBe(false); // 【確認内容】: ローディング状態の終了確認 🟡
    });

    expect(result.current.user).toBe(null); // 【確認内容】: エラー時はユーザーデータがnullであること 🟡
    expect(result.current.error).toEqual(mockError); // 【確認内容】: エラー情報が正確に設定されること 🟡
    expect(testUserService.getUserProfile).toHaveBeenCalledTimes(1); // 【確認内容】: userServiceが1回呼び出されること 🟡
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
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };

    // 【DI改善実装】: DIモックでの段階的refetchテスト設定
    // 初回は必ずエラー、2回目以降は成功データを返すよう設定
    testUserService.getUserProfile.mockRejectedValueOnce(
      new Error('Network Error'),
    );

    // 【Context DI実行】: Context Provider経由でモックサービスを注入（refetchケース）
    // 【完全分離処理】: グローバル依存ゼロでのエラー発生後の再試行処理確認
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserServiceProvider value={testUserService}>
        {children}
      </UserServiceProvider>
    );

    const { result } = renderHook(() => useUserProfile(), { wrapper });

    // 初回エラー確認
    await waitFor(() => {
      expect(result.current.error).toBeTruthy(); // 【確認内容】: 初回API呼び出しでエラー発生確認 🟡
    });

    // refetch用のDIモック成功設定を追加
    testUserService.getUserProfile.mockResolvedValueOnce(mockUser);

    // refetch実行
    await result.current.refetch();

    // 【結果検証】: refetch後の状態回復確認
    // 【期待値確認】: 再試行によるエラー回復とデータ取得
    await waitFor(() => {
      expect(result.current.loading).toBe(false); // 【確認内容】: refetch完了後のローディング終了 🟡
    });

    expect(result.current.user).toEqual(mockUser); // 【確認内容】: refetch成功でユーザーデータが設定されること 🟡
    expect(result.current.error).toBe(null); // 【確認内容】: refetch成功でエラーがクリアされること 🟡
    expect(testUserService.getUserProfile).toHaveBeenCalledTimes(2); // 【確認内容】: userServiceが2回（初回+refetch）呼び出されること 🟡
  });
});
