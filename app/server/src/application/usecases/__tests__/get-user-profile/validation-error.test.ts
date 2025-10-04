/**
 * GetUserProfileUseCase バリデーションエラーテスト
 *
 * 不正なuserIdフォーマットや無効な入力値に対するValidationError処理を検証。
 */

import { beforeEach, describe, test } from 'bun:test';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase バリデーションエラーテスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  describe('不正なuserIdフォーマット', () => {
    test('null値のuserIdでValidationErrorが発生する', async () => {
      // Given: null値のuserIdを含む不正データ
      const invalidInput = UserProfileFactory.invalidInputs.nullUserId;

      // When: null値でプロフィール取得処理を実行
      const promise = sut.sut.execute(invalidInput);

      // Then: ValidationErrorが発生し、リポジトリが呼び出されないことを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'validation');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDが必要です',
      );

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(
        sut.userRepository.findById,
      );
    });

    test('undefined値のuserIdでValidationErrorが発生する', async () => {
      // Given: undefined値のuserIdを含む不正データを準備
      const invalidInput = UserProfileFactory.invalidInputs.undefinedUserId;

      // When: undefined値でプロフィール取得処理を実行
      const promise = sut.sut.execute(invalidInput);

      // Then: ValidationErrorが発生し、リポジトリが呼び出されないことを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'validation');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDが必要です',
      );

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(
        sut.userRepository.findById,
      );
    });

    test('空文字列のuserIdでValidationErrorが発生する', async () => {
      // Given: 空文字列のuserIdを含む不正データを準備
      const invalidInput = UserProfileFactory.invalidInputs.emptyUserId;

      // When: 空文字列でプロフィール取得処理を実行
      const promise = sut.sut.execute(invalidInput);

      // Then: ValidationErrorが発生し、リポジトリが呼び出されないことを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'validation');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDが必要です',
      );

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(
        sut.userRepository.findById,
      );
    });

    test('UUID形式ではない文字列でValidationErrorが発生する', async () => {
      // Given: UUID形式ではない不正データを準備
      const invalidInput = UserProfileFactory.invalidInputs.invalidFormatUserId;

      // When: 不正な形式でプロフィール取得処理を実行
      const promise = sut.sut.execute(invalidInput);

      // Then: ValidationErrorが発生し、リポジトリが呼び出されないことを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'validation');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDはUUID形式である必要があります',
      );

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(
        sut.userRepository.findById,
      );
    });
  });

  describe('型安全性違反', () => {
    test('数値型のuserIdでValidationErrorが発生する', async () => {
      // Given: 数値型の不正データを準備
      const invalidInput = UserProfileFactory.invalidInputs.numberUserId;

      // When: 数値型でプロフィール取得処理を実行
      const promise = sut.sut.execute(invalidInput);

      // Then: ValidationErrorが発生し、リポジトリが呼び出されないことを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'validation');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDは有効な文字列である必要があります',
      );

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(
        sut.userRepository.findById,
      );
    });

    test('オブジェクト型のuserIdでValidationErrorが発生する', async () => {
      // Given: オブジェクト型の不正データを準備
      const invalidInput = UserProfileFactory.invalidInputs.objectUserId;

      // When: オブジェクト型でプロフィール取得処理を実行
      const promise = sut.sut.execute(invalidInput);

      // Then: ValidationErrorが発生し、リポジトリが呼び出されないことを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'validation');
      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDは有効な文字列である必要があります',
      );

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(
        sut.userRepository.findById,
      );
    });
  });

  describe('バリデーションエラーログ検証', () => {
    test('バリデーションエラー時に適切なログが出力される', async () => {
      // Given: バリデーションエラーログ検証用データを準備
      const invalidInput = UserProfileFactory.invalidInputs.nullUserId;

      // When: バリデーション失敗処理を実行
      try {
        await sut.sut.execute(invalidInput);
      } catch {
        // エラーは期待される動作
      }

      // Then: 適切なエラーログが出力されることを確認
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'warn',
        '必須パラメータが不足しています',
        { invalidInput: JSON.stringify(invalidInput) },
      );
    });
  });
});
