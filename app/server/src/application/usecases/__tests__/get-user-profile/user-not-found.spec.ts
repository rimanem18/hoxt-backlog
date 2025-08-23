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
    // 【テスト前準備】: 各テスト実行前にSUT（テスト対象システム）を初期化
    // 【環境初期化】: ユーザー未存在エラーのテストに特化したクリーンな環境をセットアップ
    sut = makeSUT();
  });

  describe('存在しないユーザーIDエラー', () => {
    test('存在しないuserIdでUserNotFoundErrorが発生する', async () => {
      // 【テスト目的】: 存在しないuserIdを指定した場合に適切にUserNotFoundErrorが発生することを確認
      // 【テスト内容】: userRepository.findById() がnullを返した際に、適切なドメインエラーが発生する処理をテスト
      // 【期待される動作】: UserNotFoundErrorが発生し、適切なエラーメッセージが設定される
      // 🟢 信頼性レベル: ユーザー未存在エラーハンドリングは要件定義で明確に規定されている

      // 【テストデータ準備】: 存在しないユーザーIDを指定するための入力データを作成
      // 【初期条件設定】: リポジトリがnullを返すように設定し、ユーザーが存在しない状況を模擬
      const nonExistentUserId = '12345678-1234-4321-abcd-123456789999';
      const input = UserProfileFactory.validInput(nonExistentUserId);

      // リポジトリモックの戻り値をnullに設定（ユーザーが見つからない状況）
      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(null);

      // 【実際の処理実行】: 存在しないユーザーIDでプロフィール取得処理を実行
      // 【処理内容】: UserRepository が null を返すことで、ユーザー未存在状態を再現
      const promise = sut.sut.execute(input);

      // 【結果検証】: 適切なUserNotFoundErrorが発生することを確認
      // 【期待値確認】: 特定のエラータイプとメッセージでエラーが発生することを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'user-not-found'); // 【確認内容】: UserNotFoundErrorクラスのエラーが発生することを確認 🟢

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        `ユーザーID '${nonExistentUserId}' が見つかりません`,
      ); // 【確認内容】: 存在しないuserIdを含む適切なエラーメッセージが設定されることを確認 🟢

      // 依存関係の呼び出し確認
      GetUserProfileTestMatchers.mock.toHaveBeenCalledWithUserId(
        sut.userRepository.findById,
        nonExistentUserId,
      ); // 【確認内容】: リポジトリが正しいuserIdで呼び出されたことを確認 🟢

      GetUserProfileTestMatchers.mock.toHaveBeenCalledTimes(
        sut.userRepository.findById,
        1,
      ); // 【確認内容】: リポジトリが1回だけ呼び出されたことを確認 🟢
    });
  });

  describe('複数パターンのユーザー未存在', () => {
    test.each([
      ['UUID形式の存在しないID', '00000000-0000-0000-0000-000000000000'],
      ['削除済みユーザーのID', '87654321-4321-1234-dcba-987654321000'],
      ['有効だが未登録のID', '11111111-2222-3333-4444-555555555555'],
    ])('%s でUserNotFoundErrorが発生する', async (_description, userId) => {
      // 【テスト目的】: 様々なパターンの存在しないuserIdに対して一貫してUserNotFoundErrorが発生することを確認
      // 【テスト内容】: UUID形式は正しいが実際には存在しないuserIdパターンでのエラーハンドリング
      // 【期待される動作】: userIdの形式によらず、存在しない場合は適切にUserNotFoundErrorが発生する
      // 🟡 信頼性レベル: 様々なパターンの網羅的テストは要件定義から妥当な推測として実装

      // 【テストデータ準備】: 各パターン固有のユーザーIDを使用した入力データ作成
      // 【初期条件設定】: 全パターンでリポジトリがnullを返すよう設定
      const input = UserProfileFactory.validInput(userId);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(null);

      // 【実際の処理実行】: パターン別の存在しないユーザーIDでプロフィール取得処理
      // 【処理内容】: 各パターンで統一されたエラーハンドリングが動作することを確認
      const promise = sut.sut.execute(input);

      // 【結果検証】: すべてのパターンで一貫したUserNotFoundErrorが発生することを確認
      // 【期待値確認】: パターンに関わらずUserNotFoundErrorが適切に発生することを確認
      await GetUserProfileTestMatchers.failWithError(promise, 'user-not-found'); // 【確認内容】: 全パターンでUserNotFoundErrorが発生することを確認 🟡

      await GetUserProfileTestMatchers.failWithMessage(
        promise,
        `ユーザーID '${userId}' が見つかりません`,
      ); // 【確認内容】: パターン固有のuserIdを含むエラーメッセージが生成されることを確認 🟡
    });
  });

  describe('エラーログ出力検証', () => {
    test('ユーザー未存在エラー時に適切なログが出力される', async () => {
      // 【テスト目的】: ユーザー未存在エラー発生時に運用監視に必要なログが出力されることを確認
      // 【テスト内容】: エラー発生時のerrorレベルログとデバッグ情報が適切に記録される
      // 【期待される動作】: エラーの詳細情報がログに記録され、運用時の問題調査が可能になる
      // 🔴 信頼性レベル: エラーログ出力の詳細仕様は要件定義にないが、運用上重要と判断

      // 【テストデータ準備】: エラーログ検証用の存在しないユーザーIDを準備
      // 【初期条件設定】: ログ出力を検証するためのモック設定
      const nonExistentUserId = '22222222-3333-4444-5555-666666666666';
      const input = UserProfileFactory.validInput(nonExistentUserId);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(null);

      // 【実際の処理実行】: エラーログ出力を含むユーザー未存在エラー処理
      // 【処理内容】: ログ出力機能を持つUseCaseでのエラーハンドリング実行
      try {
        await sut.sut.execute(input);
      } catch {
        // エラーは期待される動作
      }

      // 【結果検証】: 期待されるエラーログが出力されることを確認
      // 【期待値確認】: エラーレベルでの適切なログメッセージとメタデータの出力を確認
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'warn',
        'User not found',
        { userId: nonExistentUserId },
      ); // 【確認内容】: ユーザー未存在エラーログが適切なuserIdメタデータと共に出力されることを確認 🔴
    });
  });
});
