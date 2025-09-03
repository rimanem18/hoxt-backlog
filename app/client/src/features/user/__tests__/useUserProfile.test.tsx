import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { User } from '@/packages/shared-schemas/src/auth';

/*
 * useUserProfileフックのテスト
 *
 * Context DIを使用してグローバル状態を避け、
 * 完全に分離されたテスト環境を実現しています。
 */

import { UserServiceProvider } from '../contexts/UserServiceContext';
import { useUserProfile } from '../hooks/useUserProfile';
import type { UserServiceInterface } from '../services/userService';

// テストスコープ変数
let testUserService: UserServiceInterface;

describe('useUserProfile フック', () => {
  beforeEach(() => {
    // 各テスト用の独立モックサービス作成
    const mockGetUserProfile = mock().mockName(
      `test-getUserProfile-${Date.now()}`,
    );

    testUserService = {
      getUserProfile: mockGetUserProfile,
    };
  });

  afterEach(() => {
    // DIパターンにより自動分離されるため特別なクリーンアップは不要
  });

  test('初期状態でローディング中になる', async () => {
    // Given: 永続的にpending状態を維持するモックサービス
    testUserService.getUserProfile.mockImplementation(
      () => new Promise(() => {}),
    );

    // When: useUserProfileフックを呼び出す
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserServiceProvider value={testUserService}>
        {children}
      </UserServiceProvider>
    );
    const { result } = renderHook(() => useUserProfile(), { wrapper });

    // Then: 初期状態でloading: true、user: null、error: null、refetch関数が提供される
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.user).toBe(null);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.refetch).toBe('function');
  });

  test('API成功時にユーザーデータを正常取得', async () => {
    // Given: 成功レスポンスを返すモックサービス
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
    testUserService.getUserProfile.mockResolvedValue(mockUser);

    // When: useUserProfileフックを呼び出す
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserServiceProvider value={testUserService}>
        {children}
      </UserServiceProvider>
    );
    const { result } = renderHook(() => useUserProfile(), { wrapper });

    // Then: 正常なデータ取得と状態更新が行われる
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBe(null);
    expect(testUserService.getUserProfile).toHaveBeenCalledTimes(1);
  });

  test('API失敗時にエラー状態を正常設定', async () => {
    // Given: エラーレスポンスを返すモックサービス
    const mockError = new Error('プロフィール情報の取得に失敗しました');
    testUserService.getUserProfile.mockRejectedValue(mockError);

    // When: useUserProfileフックを呼び出す
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserServiceProvider value={testUserService}>
        {children}
      </UserServiceProvider>
    );
    const { result } = renderHook(() => useUserProfile(), { wrapper });

    // Then: エラー状態が適切に設定される
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toBe(null);
    expect(result.current.error).toEqual(mockError);
    expect(testUserService.getUserProfile).toHaveBeenCalledTimes(1);
  });

  test('refetch関数による再取得機能', async () => {
    // Given: 初回エラー、refetch時成功のシナリオ
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
    testUserService.getUserProfile.mockRejectedValueOnce(
      new Error('Network Error'),
    );

    // When: useUserProfileフックを呼び出しrefetch実行
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UserServiceProvider value={testUserService}>
        {children}
      </UserServiceProvider>
    );
    const { result } = renderHook(() => useUserProfile(), { wrapper });

    // 初回エラー確認
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // refetch用に成功レスポンスを設定してrefetch実行
    testUserService.getUserProfile.mockResolvedValueOnce(mockUser);
    await result.current.refetch();

    // Then: refetch後にエラーが回復しデータが取得される
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBe(null);
    expect(testUserService.getUserProfile).toHaveBeenCalledTimes(2);
  });
});
