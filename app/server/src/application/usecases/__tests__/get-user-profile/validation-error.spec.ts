/**
 * GetUserProfileUseCase バリデーションエラーテスト
 *
 * 不正なuserIdフォーマットや無効な入力値に対するValidationError処理を検証。
 * 入力値の事前検証とエラーハンドリングの適切性を確認。
 */

import { beforeEach, describe, test } from 'bun:test';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase バリデーションエラーテスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にSUT（テスト対象システム）を初期化
    // 【環境初期化】: バリデーションエラーのテストに特化したクリーンな環境をセットアップ
    sut = makeSUT();
  });

  describe('不正なuserIdフォーマット', () => {
    test('null値のuserIdでValidationErrorが発生する', async () => {
      // 【テスト目的】: null値のuserIdが入力された場合にValidationErrorが適切に発生することを確認
      // 【テスト内容】: 入力バリデーションでnull値を検出し、処理を実行せずに適切なエラーを返す
      // 【期待される動作】: ValidationErrorが発生し、リポジトリは呼び出されない
      // 🟢 信頼性レベル: 入力バリデーション要件は要件定義で明確に規定されている

      // 【テストデータ準備】: null値のuserIdを含む不正な入力データを作成
      // 【初期条件設定】: バリデーションエラーが発生する前提でテストデータを準備
      const invalidInput = UserProfileFactory.invalidInputs.nullUserId;

      // 【実際の処理実行】: null値のuserIdでプロフィール取得処理を試行
      // 【処理内容】: バリデーション層でエラーが発生し、リポジトリ層は呼び出されない
      const promise = sut.sut.execute(invalidInput);

      // 【結果検証】: 適切なValidationErrorが発生することを確認
      // 【期待値確認】: バリデーションエラータイプとメッセージが適切に設定される
      await GetUserProfileTestMatchers.failWithError(promise, 'validation'); // 【確認内容】: ValidationErrorクラスのエラーが発生することを確認 🟢

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDが必要です'
      ); // 【確認内容】: null値に対する適切なエラーメッセージが設定されることを確認 🟢

      // リポジトリが呼び出されないことを確認
      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(sut.userRepository.findById); // 【確認内容】: バリデーション失敗時にリポジトリが呼び出されないことを確認 🟢
    });

    test('undefined値のuserIdでValidationErrorが発生する', async () => {
      // 【テスト目的】: undefined値のuserIdが入力された場合にValidationErrorが適切に発生することを確認
      // 【テスト内容】: JavaScript特有のundefined値への適切な対応をテスト
      // 【期待される動作】: null値と同様にValidationErrorが発生する
      // 🟢 信頼性レベル: undefined値のハンドリングも基本的なバリデーション要件の一部

      // 【テストデータ準備】: undefined値のuserIdを含む不正な入力データを作成
      // 【初期条件設定】: undefined値が適切に検出される前提でテストデータを準備
      const invalidInput = UserProfileFactory.invalidInputs.undefinedUserId;

      // 【実際の処理実行】: undefined値のuserIdでプロフィール取得処理を試行
      // 【処理内容】: undefined値に対するバリデーション処理の実行
      const promise = sut.sut.execute(invalidInput);

      // 【結果検証】: undefined値に対する適切なValidationErrorが発生することを確認
      // 【期待値確認】: undefined値についても適切なバリデーションエラーが発生する
      await GetUserProfileTestMatchers.failWithError(promise, 'validation'); // 【確認内容】: undefined値でもValidationErrorが発生することを確認 🟢

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDが必要です'
      ); // 【確認内容】: undefined値に対してもnullと同じエラーメッセージが設定されることを確認 🟢

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(sut.userRepository.findById); // 【確認内容】: バリデーション失敗時にリポジトリが呼び出されないことを確認 🟢
    });

    test('空文字列のuserIdでValidationErrorが発生する', async () => {
      // 【テスト目的】: 空文字列のuserIdが入力された場合にValidationErrorが適切に発生することを確認
      // 【テスト内容】: 空文字列の適切な検出と、意味のあるエラーメッセージの提供をテスト
      // 【期待される動作】: ValidationErrorが発生し、空文字列に特化したエラーメッセージが提供される
      // 🟢 信頼性レベル: 空文字列のバリデーションは基本的な入力検証要件

      // 【テストデータ準備】: 空文字列のuserIdを含む不正な入力データを作成
      // 【初期条件設定】: 空文字列が適切に無効として扱われる前提でテストデータを準備
      const invalidInput = UserProfileFactory.invalidInputs.emptyUserId;

      // 【実際の処理実行】: 空文字列のuserIdでプロフィール取得処理を試行
      // 【処理内容】: 空文字列に対するバリデーション処理の実行
      const promise = sut.sut.execute(invalidInput);

      // 【結果検証】: 空文字列に対する適切なValidationErrorが発生することを確認
      // 【期待値確認】: 空文字列についても適切なバリデーションエラーが発生する
      await GetUserProfileTestMatchers.failWithError(promise, 'validation'); // 【確認内容】: 空文字列でもValidationErrorが発生することを確認 🟢

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDが必要です'
      ); // 【確認内容】: 空文字列に対して適切なエラーメッセージが設定されることを確認 🟢

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(sut.userRepository.findById); // 【確認内容】: バリデーション失敗時にリポジトリが呼び出されないことを確認 🟢
    });

    test('UUID形式ではない文字列でValidationErrorが発生する', async () => {
      // 【テスト目的】: UUID v4形式ではない文字列が入力された場合にValidationErrorが適切に発生することを確認
      // 【テスト内容】: UUID形式バリデーションの適切な動作と、形式違反に対するエラーハンドリング
      // 【期待される動作】: ValidationErrorが発生し、UUID形式に関するエラーメッセージが提供される
      // 🟢 信頼性レベル: UUID形式チェックは要件定義で明確に規定されている

      // 【テストデータ準備】: UUID形式ではない不正な文字列を含む入力データを作成
      // 【初期条件設定】: UUID形式チェックで失敗する文字列を準備
      const invalidInput = UserProfileFactory.invalidInputs.invalidFormatUserId;

      // 【実際の処理実行】: 不正な形式のuserIdでプロフィール取得処理を試行
      // 【処理内容】: UUID形式バリデーションでの失敗処理を実行
      const promise = sut.sut.execute(invalidInput);

      // 【結果検証】: UUID形式違反に対する適切なValidationErrorが発生することを確認
      // 【期待値確認】: UUID形式に特化したエラーメッセージが提供される
      await GetUserProfileTestMatchers.failWithError(promise, 'validation'); // 【確認内容】: UUID形式違反でもValidationErrorが発生することを確認 🟢

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザーIDはUUID形式である必要があります'
      ); // 【確認内容】: UUID形式に関する具体的なエラーメッセージが設定されることを確認 🟢

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(sut.userRepository.findById); // 【確認内容】: バリデーション失敗時にリポジトリが呼び出されないことを確認 🟢
    });
  });

  describe('型安全性違反', () => {
    test('数値型のuserIdでValidationErrorが発生する', async () => {
      // 【テスト目的】: 数値型のuserIdが入力された場合にValidationErrorが適切に発生することを確認
      // 【テスト内容】: TypeScript型システムを迂回した場合の実行時バリデーション動作をテスト
      // 【期待される動作】: 型違反が実行時に検出され、適切なValidationErrorが発生する
      // 🟡 信頼性レベル: 型安全性違反のハンドリングは要件定義から妥当な推測として実装

      // 【テストデータ準備】: 数値型の不正なuserIdを含む入力データを作成
      // 【初期条件設定】: 型システムを迂回した状況を模擬する不正入力を準備
      const invalidInput = UserProfileFactory.invalidInputs.numberUserId;

      // 【実際の処理実行】: 数値型のuserIdでプロフィール取得処理を試行
      // 【処理内容】: 型違反に対する実行時バリデーション処理の実行
      const promise = sut.sut.execute(invalidInput);

      // 【結果検証】: 数値型に対する適切なValidationErrorが発生することを確認
      // 【期待値確認】: 型違反についても適切なバリデーションエラーが発生する
      await GetUserProfileTestMatchers.failWithError(promise, 'validation'); // 【確認内容】: 数値型でもValidationErrorが発生することを確認 🟡

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        '無効なユーザーID形式です'
      ); // 【確認内容】: 型違反に対する適切なエラーメッセージが設定されることを確認 🟡

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(sut.userRepository.findById); // 【確認内容】: バリデーション失敗時にリポジトリが呼び出されないことを確認 🟡
    });

    test('オブジェクト型のuserIdでValidationErrorが発生する', async () => {
      // 【テスト目的】: オブジェクト型のuserIdが入力された場合にValidationErrorが適切に発生することを確認
      // 【テスト内容】: 複雑な型違反に対する堅牢なバリデーション動作をテスト
      // 【期待される動作】: オブジェクト型の入力も適切に検出され、ValidationErrorが発生する
      // 🟡 信頼性レベル: 複雑な型違反のハンドリングは要件定義から妥当な推測として実装

      // 【テストデータ準備】: オブジェクト型の不正なuserIdを含む入力データを作成
      // 【初期条件設定】: 複雑な型違反状況を模擬する不正入力を準備
      const invalidInput = UserProfileFactory.invalidInputs.objectUserId;

      // 【実際の処理実行】: オブジェクト型のuserIdでプロフィール取得処理を試行
      // 【処理内容】: 複雑な型違反に対する実行時バリデーション処理の実行
      const promise = sut.sut.execute(invalidInput);

      // 【結果検証】: オブジェクト型に対する適切なValidationErrorが発生することを確認
      // 【期待値確認】: 複雑な型違反についても適切なバリデーションエラーが発生する
      await GetUserProfileTestMatchers.failWithError(promise, 'validation'); // 【確認内容】: オブジェクト型でもValidationErrorが発生することを確認 🟡

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        '無効なユーザーID形式です'
      ); // 【確認内容】: オブジェクト型に対する適切なエラーメッセージが設定されることを確認 🟡

      GetUserProfileTestMatchers.mock.notToHaveBeenCalled(sut.userRepository.findById); // 【確認内容】: バリデーション失敗時にリポジトリが呼び出されないことを確認 🟡
    });
  });

  describe('バリデーションエラーログ検証', () => {
    test('バリデーションエラー時に適切なログが出力される', async () => {
      // 【テスト目的】: バリデーションエラー発生時に運用監視に必要なログが出力されることを確認
      // 【テスト内容】: バリデーション失敗時のwarnレベルログと無効入力の詳細記録をテスト
      // 【期待される動作】: バリデーション失敗の詳細がログに記録され、運用時の問題調査が可能になる
      // 🔴 信頼性レベル: バリデーションエラーログの詳細仕様は要件定義にないが、運用上重要と判断

      // 【テストデータ準備】: バリデーションエラーログ検証用の無効入力データを準備
      // 【初期条件設定】: ログ出力を検証するための無効なuserIdを設定
      const invalidInput = UserProfileFactory.invalidInputs.nullUserId;

      // 【実際の処理実行】: バリデーションエラーログ出力を含む処理
      // 【処理内容】: ログ出力機能を持つUseCaseでのバリデーション失敗処理実行
      try {
        await sut.sut.execute(invalidInput);
      } catch {
        // エラーは期待される動作
      }

      // 【結果検証】: 期待されるバリデーションエラーログが出力されることを確認
      // 【期待値確認】: warnレベルでの適切なログメッセージとメタデータの出力を確認
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'warn',
        'Invalid input for user profile retrieval',
        { invalidInput: JSON.stringify(invalidInput) }
      ); // 【確認内容】: バリデーションエラーログが無効入力の詳細と共に出力されることを確認 🔴
    });
  });
});