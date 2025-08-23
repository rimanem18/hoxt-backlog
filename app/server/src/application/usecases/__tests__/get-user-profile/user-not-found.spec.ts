/**
 * GetUserProfileUseCase ユーザー未存在エラーテスト
 *
 * 存在しないuserIdを指定した際のUserNotFoundError処理を検証。
 * ドメインエラーの適切な伝播とエラーログ出力を確認。
 */

import { beforeEach, describe, test } from 'bun:test';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase ユーザー未存在エラーテスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  describe('存在しないユーザーIDエラー', () => {
    test('存在しないuserIdでUserNotFoundErrorが発生する', async () => {
      // Given: 存在しないユーザーIDのテストデータ
      const nonExistentUserId = '12345678-1234-4321-abcd-123456789999';
      const input = UserProfileFactory.validInput(nonExistentUserId);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(null);

      // When: 存在しないユーザーIDでプロフィール取得処理を実行
      const promise = sut.sut.execute(input);

      // Then: UserNotFoundErrorが発生することを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'user-not-found');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        `ユーザーID '${nonExistentUserId}' が見つかりません`,
      );

      GetUserProfileTestMatchers.mock.toHaveBeenCalledWithUserId(
        sut.userRepository.findById,
        nonExistentUserId,
      );
      GetUserProfileTestMatchers.mock.toHaveBeenCalledTimes(
        sut.userRepository.findById,
        1,
      );
    });
  });

  describe('複数パターンのユーザー未存在', () => {
    test.each([
      ['UUID形式の存在しないID', '00000000-0000-0000-0000-000000000000'],
      ['削除済みユーザーのID', '87654321-4321-1234-dcba-987654321000'],
      ['有効だが未登録のID', '11111111-2222-3333-4444-555555555555'],
    ])('%s でUserNotFoundErrorが発生する', async (_description, userId) => {
      // Given: 各パターンの存在しないユーザーID
      const input = UserProfileFactory.validInput(userId);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(null);

      // When: 存在しないユーザーIDでプロフィール取得処理を実行
      const promise = sut.sut.execute(input);

      // Then: すべてのパターンでUserNotFoundErrorが発生することを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'user-not-found');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        `ユーザーID '${userId}' が見つかりません`,
      );
    });
  });

  describe('エラーログ出力検証', () => {
    test('ユーザー未存在エラー時に適切なログが出力される', async () => {
      // Given: 存在しないユーザーIDのテストデータ
      const nonExistentUserId = '22222222-3333-4444-5555-666666666666';
      const input = UserProfileFactory.validInput(nonExistentUserId);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(null);

      // When: エラーログ出力を含むユーザー未存在エラー処理を実行
      try {
        await sut.sut.execute(input);
      } catch {
        // エラーは期待される動作
      }

      // Then: ユーザー未存在エラーログが出力されることを確認
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'warn',
        'User not found',
        { userId: nonExistentUserId },
      );
    });
  });
});
