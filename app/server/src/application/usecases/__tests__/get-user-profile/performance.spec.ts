/**
 * GetUserProfileUseCase パフォーマンステスト
 *
 * ユーザープロフィール取得処理のパフォーマンス要件（500ms以内）を検証。
 */

import { beforeEach, describe, test } from 'bun:test';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase パフォーマンステスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  describe('処理時間制限テスト', () => {
    test('通常のユーザープロフィール取得が500ms以内で完了する', async () => {
      // Given: 標準的なユーザーデータ
      const user = UserProfileFactory.existingUser();
      const input = UserProfileFactory.validInput(user.id);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(user);

      // When: 処理時間を測定しながら実行
      const startTime = performance.now();
      await sut.sut.execute(input);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: 処理時間が制限内であることを確認
      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime);
    });
  });

  describe('複数ユーザー連続処理パフォーマンス', () => {
    test('10人のユーザープロフィール連続取得が各々500ms以内で完了する', async () => {
      // Given: 10人分のユーザーデータ
      const users = Array.from({ length: 10 }, (_, index) =>
        UserProfileFactory.existingUser({
          id: `1234567${index}-1234-4321-abcd-123456789000`,
          email: `performance.test.${index}@example.com`,
          name: `パフォーマンステストユーザー${index}`,
        }),
      );

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };

      // When & Then: 各ユーザーの処理時間を測定し、制限時間内で完了することを確認
      for (const user of users) {
        mockFindById.mockResolvedValue(user);
        const input = UserProfileFactory.validInput(user.id);

        const startTime = performance.now();
        await sut.sut.execute(input);
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime);
      }
    });
  });

  describe('大容量データパフォーマンス', () => {
    test('大容量プロフィールデータでも500ms以内で取得完了する', async () => {
      // Given: 大容量データを含むユーザー情報
      const largeUser = UserProfileFactory.existingUser({
        name: 'テスト用の非常に長いユーザー名'.repeat(50),
        email: `very.long.email.address.for.performance.test${'a'.repeat(100)}@example.com`,
        avatarUrl: `https://example.com/very/long/path/to/avatar/image/${'path/'.repeat(50)}avatar.jpg`,
      });
      const input = UserProfileFactory.validInput(largeUser.id);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(largeUser);

      // When: 大容量データの処理時間を測定しながら実行
      const startTime = performance.now();
      await sut.sut.execute(input);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: 大容量データでも制限時間内で完了することを確認
      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime);
    });
  });

  describe('エラー処理パフォーマンス', () => {
    test('ユーザー未存在エラーも500ms以内で応答する', async () => {
      // Given: 存在しないユーザーIDのテストデータ
      const nonExistentUserId = '33333333-4444-5555-6666-777777777777';
      const input = UserProfileFactory.validInput(nonExistentUserId);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(null);

      // When & Then: エラー処理の時間を測定し、制限時間内で完了することを確認
      const startTime = performance.now();

      try {
        await sut.sut.execute(input);
      } catch {
        // エラーは期待される動作
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime);
    });

    test('インフラエラーも500ms以内で応答する', async () => {
      // Given: インフラエラーが発生するテストデータ
      const validInput = UserProfileFactory.validInput();

      const mockFindById = sut.userRepository.findById as unknown as {
        mockRejectedValue: (error: Error) => void;
      };
      const infraError = new Error('データベース接続エラー');
      mockFindById.mockRejectedValue(infraError);

      // When & Then: インフラエラー処理の時間を測定し、制限時間内で完了することを確認
      const startTime = performance.now();

      try {
        await sut.sut.execute(validInput);
      } catch {
        // エラーは期待される動作
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime);
    });
  });
});
