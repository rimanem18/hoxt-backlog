import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { UserProfile } from '../components/UserProfile';
import { User } from '@/packages/shared-schemas/src/auth';

describe('UserProfile', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    cleanup();
  });

  test('認証済みユーザー情報の表示', () => {
    // Given: 認証済みユーザーの完全なプロフィール情報を準備
    const mockUser: User = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      externalId: "google_123456789",
      provider: "google" as const,
      email: "user@example.com",
      name: "山田太郎",
      avatarUrl: "https://lh3.googleusercontent.com/a/avatar.jpg",
      createdAt: "2025-08-29T10:30:00.000Z",
      updatedAt: "2025-08-29T10:30:00.000Z",
      lastLoginAt: "2025-08-29T13:45:00.000Z"
    };

    // When: UserProfileコンポーネントをユーザー情報付きでレンダリング
    render(<UserProfile user={mockUser} />);

    // Then: ユーザー情報が正しく表示される
    expect(screen.getByText("山田太郎")).toBeTruthy();
    expect(screen.getByText("user@example.com")).toBeTruthy();
    
    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage.getAttribute('src')).toBe("https://lh3.googleusercontent.com/a/avatar.jpg");
    
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy();
  });

  test('アバター画像フォールバック処理', () => {
    // Given: アバター画像URLがnullのユーザー情報を準備
    const mockUserWithoutAvatar: User = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      externalId: "google_123456789", 
      provider: "google" as const,
      email: "user@example.com",
      name: "テストユーザー",
      avatarUrl: null,
      createdAt: "2025-08-29T10:30:00.000Z",
      updatedAt: "2025-08-29T10:30:00.000Z",
      lastLoginAt: "2025-08-29T13:45:00.000Z"
    };

    // When: avatarUrl=nullでUserProfileコンポーネントをレンダリング
    render(<UserProfile user={mockUserWithoutAvatar} />);

    // Then: デフォルトアバター画像が表示され、他の情報も正常に表示される
    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage.getAttribute('src')).toContain('/default-avatar.png');
    
    expect(screen.getByText("テストユーザー")).toBeTruthy();
    expect(screen.getByText("user@example.com")).toBeTruthy();
  });
});