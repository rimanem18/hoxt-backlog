/**
 * GetUserProfileUseCase インフラエラーテスト
 *
 * データベース接続エラーやその他のインフラレイヤー障害に対する
 * InfrastructureError処理を検証。システム障害時の適切なエラー伝播を確認。
 */

import { beforeEach, describe, test } from 'bun:test';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase インフラエラーテスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にSUT（テスト対象システム）を初期化
    // 【環境初期化】: インフラエラーのテストに特化したクリーンな環境をセットアップ
    sut = makeSUT();
  });

  describe('データベース接続エラー', () => {
    test('データベース接続失敗でInfrastructureErrorが発生する', async () => {
      // 【テスト目的】: データベース接続エラーが発生した場合にInfrastructureErrorが適切に発生することを確認
      // 【テスト内容】: userRepository.findById() がデータベースエラーを発生させた際の適切なエラーハンドリング
      // 【期待される動作】: InfrastructureErrorが発生し、適切なエラーメッセージが設定される
      // 🟢 信頼性レベル: インフラエラーハンドリングは要件定義で明確に規定されている

      // 【テストデータ準備】: インフラエラーテスト用の有効な入力データを作成
      // 【初期条件設定】: リポジトリがデータベース接続エラーを発生させるように設定
      const validInput = UserProfileFactory.validInput();

      // リポジトリモックがデータベース接続エラーを発生させるように設定
      const mockFindById = sut.userRepository.findById as unknown as {
        mockRejectedValue: (error: Error) => void;
      };
      const databaseError = new Error('データベース接続に失敗しました');
      mockFindById.mockRejectedValue(databaseError);

      // 【実際の処理実行】: データベースエラーが発生する状況でプロフィール取得処理を実行
      // 【処理内容】: データベース接続エラーを適切にInfrastructureErrorとして変換する処理
      const promise = sut.sut.execute(validInput);

      // 【結果検証】: 適切なInfrastructureErrorが発生することを確認
      // 【期待値確認】: データベースエラーがInfrastructureErrorとして適切に変換される
      await GetUserProfileTestMatchers.failWithError(promise, 'infrastructure'); // 【確認内容】: InfrastructureErrorクラスのエラーが発生することを確認 🟢

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'ユーザー情報の取得に失敗しました',
      ); // 【確認内容】: インフラエラーに対する適切なエラーメッセージが設定されることを確認 🟢

      // 依存関係の呼び出し確認
      GetUserProfileTestMatchers.mock.toHaveBeenCalledWithUserId(
        sut.userRepository.findById,
        validInput.userId,
      ); // 【確認内容】: リポジトリが正しいuserIdで呼び出されたことを確認 🟢

      GetUserProfileTestMatchers.mock.toHaveBeenCalledTimes(
        sut.userRepository.findById,
        1,
      ); // 【確認内容】: エラー発生時でもリポジトリが1回だけ呼び出されたことを確認 🟢
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
        // 【テスト目的】: 様々なシステムリソースエラーに対して一貫してInfrastructureErrorが発生することを確認
        // 【テスト内容】: 異なる種類のインフラ障害に対する統一されたエラーハンドリング
        // 【期待される動作】: 原因の違いによらず、InfrastructureErrorとして適切に処理される
        // 🟡 信頼性レベル: 様々なシステムエラーの網羅的テストは要件定義から妥当な推測として実装

        // 【テストデータ準備】: システムエラーテスト用の有効な入力データを作成
        // 【初期条件設定】: 各種システムエラーを発生させるリポジトリモック設定
        const validInput = UserProfileFactory.validInput();

        const mockFindById = sut.userRepository.findById as unknown as {
          mockRejectedValue: (error: Error) => void;
        };
        mockFindById.mockRejectedValue(systemError);

        // 【実際の処理実行】: 各種システムエラーが発生する状況でプロフィール取得処理を実行
        // 【処理内容】: 異なるシステムエラーが統一されたInfrastructureErrorとして処理される
        const promise = sut.sut.execute(validInput);

        // 【結果検証】: すべてのシステムエラーで一貫したInfrastructureErrorが発生することを確認
        // 【期待値確認】: エラーの種類によらずInfrastructureErrorが適切に発生する
        await GetUserProfileTestMatchers.failWithError(
          promise,
          'infrastructure',
        ); // 【確認内容】: 全種類のシステムエラーでInfrastructureErrorが発生することを確認 🟡

        await GetUserProfileTestMatchers.failWithMessage(
          promise,
          'システムエラーが発生しました',
        ); // 【確認内容】: システムエラーに対する統一されたエラーメッセージが生成されることを確認 🟡
      },
    );
  });

  describe('パフォーマンス関連エラー', () => {
    test('データベースクエリタイムアウトでInfrastructureErrorが発生する', async () => {
      // 【テスト目的】: データベースクエリタイムアウトが発生した場合にInfrastructureErrorが適切に発生することを確認
      // 【テスト内容】: 長時間のクエリ実行に対するタイムアウト処理とエラーハンドリング
      // 【期待される動作】: タイムアウトエラーが適切にInfrastructureErrorとして処理される
      // 🟡 信頼性レベル: クエリタイムアウトの処理は要件定義から妥当な推測として実装

      // 【テストデータ準備】: タイムアウトエラーテスト用の有効な入力データを作成
      // 【初期条件設定】: データベースクエリタイムアウトを発生させるリポジトリモック設定
      const validInput = UserProfileFactory.validInput();

      const mockFindById = sut.userRepository.findById as unknown as {
        mockRejectedValue: (error: Error) => void;
      };
      const timeoutError = new Error('Query execution timeout');
      mockFindById.mockRejectedValue(timeoutError);

      // 【実際の処理実行】: クエリタイムアウトが発生する状況でプロフィール取得処理を実行
      // 【処理内容】: タイムアウトエラーを適切にInfrastructureErrorとして処理
      const promise = sut.sut.execute(validInput);

      // 【結果検証】: タイムアウトエラーが適切にInfrastructureErrorとして処理されることを確認
      // 【期待値確認】: タイムアウト特有のエラーメッセージが提供される
      await GetUserProfileTestMatchers.failWithError(promise, 'infrastructure'); // 【確認内容】: タイムアウトでもInfrastructureErrorが発生することを確認 🟡

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        'データベース接続エラー',
      ); // 【確認内容】: タイムアウトに対する適切なエラーメッセージが設定されることを確認 🟡
    });
  });

  describe('インフラエラーログ検証', () => {
    test('インフラエラー時に適切なログが出力される', async () => {
      // 【テスト目的】: インフラエラー発生時に運用監視に必要なログが出力されることを確認
      // 【テスト内容】: インフラ障害時のerrorレベルログと障害詳細情報が適切に記録される
      // 【期待される動作】: インフラ障害の詳細がログに記録され、運用時の障害対応が可能になる
      // 🔴 信頼性レベル: インフラエラーログの詳細仕様は要件定義にないが、運用上重要と判断

      // 【テストデータ準備】: インフラエラーログ検証用の入力データを準備
      // 【初期条件設定】: インフラエラーとログ出力を検証するための設定
      const validInput = UserProfileFactory.validInput(
        '44444444-5555-6666-7777-888888888888',
      );
      const infraError = new Error('データベース接続障害');

      const mockFindById = sut.userRepository.findById as unknown as {
        mockRejectedValue: (error: Error) => void;
      };
      mockFindById.mockRejectedValue(infraError);

      // 【実際の処理実行】: インフラエラーログ出力を含む処理
      // 【処理内容】: ログ出力機能を持つUseCaseでのインフラエラーハンドリング実行
      try {
        await sut.sut.execute(validInput);
      } catch {
        // エラーは期待される動作
      }

      // 【結果検証】: 期待されるインフラエラーログが出力されることを確認
      // 【期待値確認】: errorレベルでの適切なログメッセージと障害詳細の出力を確認
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'error',
        'User profile retrieval error',
        {
          userId: validInput.userId,
          error: 'データベース接続障害',
        },
      ); // 【確認内容】: インフラエラーログが障害詳細と共に出力されることを確認 🔴
    });
  });
});
