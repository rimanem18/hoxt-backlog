/**
 * ユーザープロフィール取得テスト用データファクトリ
 *
 * テストケース間で一貫したテストデータを提供し、
 * 可読性とメンテナンス性を向上させる。
 */

import type { AuthProvider } from '@/domain/user/AuthProvider';
import type { User } from '@/domain/user/UserEntity';

/**
 * テスト用ユーザーデータファクトリ
 */
export const UserProfileFactory = {
  /**
   * 既存ユーザーのテストデータを作成
   *
   * @param overrides 上書きしたいプロパティ
   * @returns 既存ユーザーエンティティ
   */
  existingUser(overrides: Partial<User> = {}): User {
    const now = new Date();
    const lastLogin = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1日前

    return {
      id: '12345678-1234-4321-abcd-123456789abc',
      externalId: 'google_existing_user_123',
      provider: 'google' as AuthProvider,
      email: 'existing.user@test.com',
      name: '既存テストユーザー',
      avatarUrl: 'https://example.com/avatar/existing.jpg',
      // emailVerifiedプロパティは実際のUser型に存在しないため削除
      // isActiveとroleプロパティは実際のUser型に存在しないため削除
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7日前
      updatedAt: now,
      lastLoginAt: lastLogin,
      ...overrides,
    };
  },

  /**
   * 有効なUserID入力値を作成
   *
   * @param userId カスタムユーザーID（UUID v4形式）
   * @returns 入力オブジェクト
   */
  validInput(userId = '12345678-1234-4321-abcd-123456789abc') {
    return { userId };
  },

  /**
   * 無効なUserID入力値のバリエーション
   */
  invalidInputs: {
    // 🔴 null値
    nullUserId: { userId: null as unknown as string },

    // 🔴 undefined値
    undefinedUserId: { userId: undefined as unknown as string },

    // 🔴 空文字列
    emptyUserId: { userId: '' },

    // 🔴 UUID形式ではない文字列
    invalidFormatUserId: { userId: 'invalid-user-id' },

    // 🔴 数値
    numberUserId: { userId: 12345 as unknown as string },

    // 🔴 オブジェクト
    objectUserId: { userId: { id: 'test' } as unknown as string },
  },

  /**
   * 期待される成功レスポンス
   *
   * @param user ユーザーエンティティ
   * @returns 成功レスポンス
   */
  expectedSuccessResponse(user: User) {
    return { user };
  },
} as const;
