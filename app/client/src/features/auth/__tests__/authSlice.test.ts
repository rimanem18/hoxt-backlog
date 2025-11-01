import { beforeEach, describe, expect, test } from 'bun:test';
import { type AuthState, authSlice } from '@/features/auth/store/authSlice';
import type { User } from '@/packages/shared-schemas/src/auth';

describe('authSlice', () => {
  beforeEach(() => {});

  test('認証状態の初期値が正しく設定される', () => {
    // Given: アプリケーション起動時の状態

    // When: authSliceの初期状態を取得
    const initialState: AuthState = authSlice.getInitialState();

    // Then: 未認証状態の初期値が正しく設定される
    expect(initialState.isAuthenticated).toBe(false);
    expect(initialState.user).toBe(null);
    expect(initialState.isLoading).toBe(false);
    expect(initialState.error).toBe(null);
  });

  test('Google認証成功時の状態更新', () => {
    // Given: 認証成功レスポンスのモックデータを準備
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-08-29T13:45:00.000Z',
    };

    const initialState: AuthState = {
      isAuthenticated: false,
      user: null,
      isLoading: true,
      error: null,
    };

    // When: authSuccessアクションを発火してstate更新処理を実行
    const action = authSlice.actions.authSuccess({
      user: mockUser,
      isNewUser: false,
    });
    const newState = authSlice.reducer(initialState, action);

    // Then: 認証成功状態に正しく更新される
    expect(newState.isAuthenticated).toBe(true);
    expect(newState.user).toEqual(mockUser);
    expect(newState.isLoading).toBe(false);
    expect(newState.error).toBe(null);
  });
});
