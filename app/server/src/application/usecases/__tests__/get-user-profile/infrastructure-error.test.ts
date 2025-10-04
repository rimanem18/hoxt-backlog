/**
 * GetUserProfileUseCase インフラエラーテスト
 *
 * データベース接続エラーやその他のインフラレイヤー障害に対する
 * InfrastructureError処理を検証。
 */

import { beforeEach, describe, test } from 'bun:test';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase インフラエラーテスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  describe('データベース接続エラー', () => {
    test('データベース接続失敗でInfrastructureErrorが発生する', async () => {
      // Given: データベース接続エラーが発生するテストデータ
      const validInput = UserProfileFactory.validInput();

      const mockFindById = sut.userRepository.findById as unknown as {
        mockRejectedValue: (error: Error) => void;
      };
      const databaseError = new Error('データベース接続に失敗しました');
      mockFindById.mockRejectedValue(databaseError);

      // When: データベースエラーが発生する状況で処理を実行
      const promise = sut.sut.execute(validInput);

      // Then: InfrastructureErrorが発生することを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'infrastructure');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザー情報の取得に失敗しました',
      );

      GetUserProfileTestMatchers.mock.toHaveBeenCalledWithUserId(
        sut.userRepository.findById,
        validInput.userId,
      );
      GetUserProfileTestMatchers.mock.toHaveBeenCalledTimes(
        sut.userRepository.findById,
        1,
      );
    });
  });

  describe('システムリソースエラー', () => {
    test.each([
      ['メモリ不足エラー', new Error('Out of memory')],
      ['ファイルシステムエラー', new Error('File system full')],
      ['ネットワークタイムアウト', new Error('Network timeout')],
      ['権限エラー', new Error('Permission denied')],
    ])(
      '%s でInfrastructureErrorが発生する',
      async (_description, systemError) => {
        // Given: システムエラーが発生するテストデータ
        const validInput = UserProfileFactory.validInput();

        const mockFindById = sut.userRepository.findById as unknown as {
          mockRejectedValue: (error: Error) => void;
        };
        mockFindById.mockRejectedValue(systemError);

        // When: システムエラーが発生する状況で処理を実行
        const promise = sut.sut.execute(validInput);

        // Then: すべてのシステムエラーでInfrastructureErrorが発生することを確認
        await GetUserProfileTestMatchers.failWithError(
          promise,
          'infrastructure',
        );
        await GetUserProfileTestMatchers.failWithMessage(
          promise,
          'システムエラーが発生しました',
        );
      },
    );
  });

  describe('パフォーマンス関連エラー', () => {
    test('データベースクエリタイムアウトでInfrastructureErrorが発生する', async () => {
      // Given: クエリタイムアウトが発生するテストデータ
      const validInput = UserProfileFactory.validInput();

      const mockFindById = sut.userRepository.findById as unknown as {
        mockRejectedValue: (error: Error) => void;
      };
      const timeoutError = new Error('Query execution timeout');
      mockFindById.mockRejectedValue(timeoutError);

      // When: タイムアウトが発生する状況で処理を実行
      const promise = sut.sut.execute(validInput);

      // Then: タイムアウトエラーが適切に処理されることを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'infrastructure');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'データベース接続エラー',
      );
    });
  });

  describe('インフラエラーログ検証', () => {
    test('インフラエラー時に適切なログが出力される', async () => {
      // Given: インフラエラーログ検証用のテストデータ
      const validInput = UserProfileFactory.validInput(
        '44444444-5555-6666-7777-888888888888',
      );
      const infraError = new Error('データベース接続障害');

      const mockFindById = sut.userRepository.findById as unknown as {
        mockRejectedValue: (error: Error) => void;
      };
      mockFindById.mockRejectedValue(infraError);

      // When: インフラエラー処理を実行
      try {
        await sut.sut.execute(validInput);
      } catch {
        // エラーは期待される動作
      }

      // Then: インフラエラーログが出力されることを確認
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'error',
        'User profile retrieval error',
        {
          userId: validInput.userId,
          error: 'データベース接続障害',
        },
      );
    });
  });
});
