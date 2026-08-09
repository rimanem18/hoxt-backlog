import { afterEach, describe, expect, test } from 'bun:test';
import type { User } from '@hoxt-backlog/shared-schemas/auth';
import { cleanup, render, screen } from '@testing-library/react';
import { UserProfileView } from '@/features/auth/components/UserProfileView';

describe('UserProfileView', () => {
  afterEach(() => {
    cleanup();
  });

  test('avatarUrlが存在する場合、名前・メール・アバター画像が表示される', () => {
    // Given: avatarUrlを持つユーザー情報
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

    // When: UserProfileViewをレンダリング
    render(<UserProfileView user={mockUser} />);

    // Then: 名前・メール・アバター画像が表示される
    expect(screen.getByText('山田太郎')).toBeTruthy();
    expect(screen.getByText('user@example.com')).toBeTruthy();

    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage.getAttribute('src')).toContain(
      'https%3A%2F%2Flh3.googleusercontent.com%2Fa%2Favatar.jpg',
    );
  });

  test('avatarUrlがnullのときイニシャルアバターSVGが表示される', () => {
    // Given: avatarUrlがnullのユーザー情報
    const mockUserWithoutAvatar: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: 'テストユーザー',
      avatarUrl: null,
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-08-29T13:45:00.000Z',
    };

    // When: avatarUrl=nullでUserProfileViewをレンダリング
    render(<UserProfileView user={mockUserWithoutAvatar} />);

    // Then: イニシャルアバターSVGが表示され、他の情報も正常に表示される
    const avatarImage = screen.getByRole('img', {
      name: 'テストユーザーのプロフィール画像',
    });
    expect(avatarImage.tagName).toBe('svg');
    expect(screen.getByText('テ')).toBeTruthy();
    expect(screen.getByText('テストユーザー')).toBeTruthy();
    expect(screen.getByText('user@example.com')).toBeTruthy();
  });

  test('childrenに渡した要素がボタン位置に表示される', () => {
    // Given: 識別可能な子要素を持つユーザー情報
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: null,
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: null,
    };

    // When: childrenにボタン要素を渡してレンダリング
    render(
      <UserProfileView user={mockUser}>
        <button type="button">ログアウト</button>
      </UserProfileView>,
    );

    // Then: childrenで渡したボタンが表示される
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy();
  });
});
