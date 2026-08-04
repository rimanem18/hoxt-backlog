import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { User } from '@hoxt-backlog/shared-schemas/auth';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { UserProfile } from '@/features/auth/components/UserProfile';
import authReducer from '@/features/auth/store/authSlice';

// Supabaseクライアントをモック
const mockSignOut = mock(() => Promise.resolve({ error: null }));

// @/lib/supabaseモジュール全体をモック
mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: mockSignOut,
    },
  },
}));

describe('UserProfile', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    mockSignOut.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  test('ユーザー名とログアウトボタンが合成表示される', () => {
    // Given: 認証済みユーザーのプロフィール情報を準備
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://lh3.googleusercontent.com/a/avatar.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-08-29T13:45:00.000Z',
    };

    // Redux store を準備
    const store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });

    // When: UserProfileコンポーネントをユーザー情報付きでレンダリング
    render(
      <Provider store={store}>
        <UserProfile user={mockUser} />
      </Provider>,
    );

    // Then: UserProfileViewの表示とLogoutButtonが合成されて表示される
    expect(screen.getByText('山田太郎')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy();
  });

  test('ログアウトボタンをクリックするとsupabaseのsignOutとReduxのlogoutアクションが呼ばれる', async () => {
    // Given: Reduxストアとモックを準備
    const store = configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            externalId: 'google_123456789',
            provider: 'google' as const,
            email: 'user@example.com',
            name: '山田太郎',
            avatarUrl: 'https://lh3.googleusercontent.com/a/avatar.jpg',
            createdAt: '2025-08-29T10:30:00.000Z',
            updatedAt: '2025-08-29T10:30:00.000Z',
            lastLoginAt: '2025-08-29T13:45:00.000Z',
          },
          isLoading: false,
          error: null,
        },
      },
    });

    const authState = store.getState().auth;
    const mockUser: User = authState.user as User;

    // When: UserProfileコンポーネントをレンダリングしてログアウトボタンをクリック
    render(
      <Provider store={store}>
        <UserProfile user={mockUser} />
      </Provider>,
    );

    const user = userEvent.setup();
    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });

    // Then: ログアウトボタンがクリック可能な状態で存在することを確認
    expect(logoutButton).toBeTruthy();

    // ログアウトボタンをクリック
    await user.click(logoutButton);

    // Supabaseのログアウトメソッドが呼ばれることを検証
    expect(mockSignOut).toHaveBeenCalled();

    // Redux状態がログアウト状態に更新されることを検証
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.user).toBe(null);
  });
});
