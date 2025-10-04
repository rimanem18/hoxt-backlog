/**
 * GetUserProfileUseCase 正常系テスト
 *
 * ユーザープロフィール取得機能の正常なフローを検証。
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type { AuthProvider } from '@/domain/user/AuthProvider';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase 正常系テスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  describe('ユーザープロフィール取得成功', () => {
    test('有効なuserIdでユーザープロフィールの取得が成功する', async () => {
      // Given: 既存ユーザーのテストデータ
      const existingUser = UserProfileFactory.existingUser({
        id: '12345678-1234-4321-abcd-123456789abc',
        externalId: 'google_test_user_123',
        email: 'test.user@example.com',
        name: 'テストユーザー',
      });

      const input = UserProfileFactory.validInput(
        '12345678-1234-4321-abcd-123456789abc',
      );

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(existingUser);

      // When: ユーザープロフィール取得処理を実行
      const result = await sut.sut.execute(input);

      // Then: 期待される結果が返されることを確認
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();

      GetUserProfileTestMatchers.haveUserProperties(result.user, {
        id: '12345678-1234-4321-abcd-123456789abc',
        externalId: 'google_test_user_123',
        email: 'test.user@example.com',
        name: 'テストユーザー',
      });

      GetUserProfileTestMatchers.mock.toHaveBeenCalledWithUserId(
        sut.userRepository.findById,
        '12345678-1234-4321-abcd-123456789abc',
      );
      GetUserProfileTestMatchers.mock.toHaveBeenCalledTimes(
        sut.userRepository.findById,
        1,
      );
    });
  });

  describe('複数プロバイダー対応', () => {
    test.each([
      ['Google', 'google', 'google_user_123', 'google.user@gmail.com'],
      ['GitHub', 'github', 'github_user_456', 'github.user@github.com'],
      [
        'Facebook',
        'facebook',
        'facebook_user_789',
        'facebook.user@facebook.com',
      ],
    ])(
      '%s プロバイダーユーザーのプロフィール取得が成功する',
      async (_provider, providerType, externalId, email) => {
        // Given: プロバイダー固有のユーザーデータ
        const user = UserProfileFactory.existingUser({
          externalId,
          provider: providerType as AuthProvider,
          email,
          name: `${_provider}ユーザー`,
        });
        const input = UserProfileFactory.validInput(user.id);

        const mockFindById = sut.userRepository.findById as unknown as {
          mockResolvedValue: (value: unknown) => void;
        };
        mockFindById.mockResolvedValue(user);

        // When: プロフィール取得処理を実行
        const result = await sut.sut.execute(input);

        // Then: プロバイダー固有の情報が正しく返されることを確認
        expect(result).toBeDefined();
        expect(result.user.provider).toBe(providerType as AuthProvider);
        expect(result.user.externalId).toBe(externalId);
        expect(result.user.email).toBe(email);
      },
    );
  });

  describe('パフォーマンステスト', () => {
    test('ユーザープロフィール取得が500ms以内で完了する', async () => {
      // Given: パフォーマンステスト用データ
      const user = UserProfileFactory.existingUser();
      const input = UserProfileFactory.validInput(user.id);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(user);

      // When & Then: 処理時間を測定し、制限内で完了することを確認
      const startTime = performance.now();
      await sut.sut.execute(input);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime);
    });
  });

  describe('ログ出力検証', () => {
    test('ユーザープロフィール取得成功時に適切なログが出力される', async () => {
      // Given: ログ検証用のテストデータ
      const user = UserProfileFactory.existingUser({
        id: '12345678-1234-4321-abcd-123456789abc',
      });
      const input = UserProfileFactory.validInput(
        '12345678-1234-4321-abcd-123456789abc',
      );

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(user);

      // When: プロフィール取得処理を実行
      await sut.sut.execute(input);

      // Then: 適切なログが出力されることを確認
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'info',
        'User profile retrieval started',
        { userId: '12345678-1234-4321-abcd-123456789abc' },
      );
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'info',
        'User profile retrieved successfully',
        { userId: '12345678-1234-4321-abcd-123456789abc' },
      );
    });
  });
});
