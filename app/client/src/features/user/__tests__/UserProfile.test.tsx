import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@/packages/shared-schemas/src/auth';
import { UserProfile } from '../components/UserProfile';
import { UserServiceProvider } from '../contexts/UserServiceContext';
import type { UserServiceInterface } from '../services/userService';

// Context DI用UserServiceモック
let mockUserService: UserServiceInterface;

describe('TASK-302: ユーザープロフィール表示実装', () => {
  beforeEach(() => {
    // 各テスト用の独立 UserService モック作成
    const mockGetUserProfile = mock().mockName(
      `userprofile-test-${Date.now()}`,
    );

    mockUserService = {
      getUserProfile: mockGetUserProfile,
    };
  });

  afterEach(() => {
    cleanup();
  });

  // ===== 1. 正常系テストケース（基本的な動作） =====

  test('1-1. 認証済みユーザーの完全なプロフィール情報表示', async () => {
    // Given: 完全なユーザー情報を持つモックデータ
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
    mockUserService.getUserProfile.mockResolvedValue(mockUser);

    // When: UserProfileコンポーネントをレンダリング
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // Then: 各ユーザー情報が正確に表示される
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: '山田太郎' }),
      ).toBeTruthy();
    });
    expect(screen.getByText('user@example.com')).toBeTruthy();

    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage).toBeTruthy();
    expect(avatarImage.getAttribute('width')).toBe('64');

    expect(screen.getByText(/2025年9月1日.*19:30/)).toBeTruthy();
  });

  test('1-2. プロフィール取得中のスケルトンUI表示', () => {
    // Given: API呼び出し中の遅延状態をシミュレート
    mockUserService.getUserProfile.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockUser), 1000)),
    );

    // When: UserProfileコンポーネントをレンダリング
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // Then: スケルトンUIが適切に表示される
    expect(screen.getByRole('status', { name: /読み込み中/i })).toBeTruthy();
    expect(screen.getByTestId('avatar-skeleton')).toBeTruthy();
    expect(screen.getByTestId('name-skeleton')).toBeTruthy();
    expect(screen.getByTestId('email-skeleton')).toBeTruthy();
    expect(screen.getByTestId('lastlogin-skeleton')).toBeTruthy();
  });

  test('1-3. 各画面サイズでの適切なレスポンシブレイアウト表示', () => {
    // Given: 通常のユーザー情報
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
    mockUserService.getUserProfile.mockResolvedValue(mockUser);

    // When: UserProfileコンポーネントをレンダリング
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // Then: レスポンシブクラスが適用される
    const container = screen.getByTestId('user-profile-container');
    expect(container).toHaveClass('responsive-container');

    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage).toHaveClass('responsive-avatar');
  });

  // ===== 2. 異常系テストケース（エラーハンドリング） =====

  test('2-1. バックエンドAPI通信失敗時のエラー表示と再試行機能', async () => {
    // Given: API呼び出しでエラーが発生
    mockUserService.getUserProfile.mockRejectedValue(
      new Error('プロフィール情報の取得に失敗しました'),
    );

    // When: UserProfileコンポーネントをレンダリング
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // Then: エラーメッセージと再試行ボタンが表示される
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(
      screen.getByText('プロフィール情報の取得に失敗しました'),
    ).toBeTruthy();

    const retryButton = screen.getByRole('button', { name: /再試行/i });
    expect(retryButton).toBeTruthy();

    // 再試行ボタンクリックでrefetchが呼ばれる
    const user = userEvent.setup();
    await user.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  test('2-2. JWT認証失敗時の適切なエラー処理', () => {
    // Given: 認証エラーが発生
    mockUserService.getUserProfile.mockRejectedValue(
      new Error('認証が必要です。再度ログインしてください'),
    );

    // When: UserProfileコンポーネントをレンダリング
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // Then: 認証エラーメッセージとログインリンクが表示される
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(
      screen.getByText('認証が必要です。再度ログインしてください'),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /ログインページへ/i }),
    ).toBeTruthy();
  });

  test('2-3. ネットワーク接続不良時のエラー処理', () => {
    // Given: ネットワークエラーが発生
    mockUserService.getUserProfile.mockRejectedValue(
      new Error('インターネット接続を確認してください'),
    );

    // When: UserProfileコンポーネントをレンダリング
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // Then: ネットワークエラーメッセージとオフライン表示が表示される
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(
      screen.getByText('インターネット接続を確認してください'),
    ).toBeTruthy();
    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
  });

  // ===== 3. 境界値テストケース（最小値、最大値、null等） =====

  test('3-1. 50文字を超える長いユーザー名の適切な省略表示', () => {
    // Given: 51文字の長いユーザー名
    const longNameUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '12345678901234567890123456789012345678901234567890X', // 51文字
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };
    mockUserService.getUserProfile.mockResolvedValue(longNameUser);

    // When: UserProfileコンポーネントをレンダリング
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // Then: 47文字+"..."で省略表示され、title属性に完全名が設定される
    const nameElement = screen.getByRole('heading', { level: 2 });
    expect(nameElement.textContent).toMatch(/^.{47}\.{3}$/);
    expect(nameElement.getAttribute('title')).toBe(longNameUser.name);
  });

  test('3-2. アバター画像URL無効時のデフォルト画像表示', async () => {
    // Given: 無効なアバターURLを持つユーザーデータ
    const userWithInvalidAvatar: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://invalid-url.example.com/404.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };
    mockUserService.getUserProfile.mockResolvedValue(userWithInvalidAvatar);

    // When: UserProfileコンポーネントをレンダリングし、画像エラーをシミュレート
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    // 画像読み込みエラーをシミュレート
    fireEvent.error(avatarImage);

    // Then: デフォルト画像にフォールバックされる
    await waitFor(() => {
      expect(avatarImage.getAttribute('src')).toContain('default-avatar.png');
    });
    expect(avatarImage.getAttribute('alt')).toBe('プロフィール画像');
  });

  test('3-3. 必須フィールド以外がnull/undefinedの場合の適切な表示', () => {
    // Given: avatarUrlとlastLoginAtがnullの新規ユーザーデータ
    const incompleteUser: User = {
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
    mockUserService.getUserProfile.mockResolvedValue(incompleteUser);

    // When: UserProfileコンポーネントをレンダリング
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // Then: 必須フィールドは表示され、null値にはデフォルト表示が適用される
    expect(screen.getByText('山田太郎')).toBeTruthy();
    expect(screen.getByText('user@example.com')).toBeTruthy();
    expect(screen.getByText(/初回ログインです/)).toBeTruthy();

    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage.getAttribute('src')).toContain('default-avatar.png');
  });
});
