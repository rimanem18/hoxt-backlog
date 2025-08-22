/**
 * GetUserProfileUseCase パフォーマンステスト
 *
 * ユーザープロフィール取得処理のパフォーマンス要件（500ms以内）を検証。
 * 負荷状況や大量データでの処理時間制限の遵守を確認。
 */

import { beforeEach, describe, test } from 'bun:test';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase パフォーマンステスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にSUT（テスト対象システム）を初期化
    // 【環境初期化】: パフォーマンステストに特化したクリーンな環境をセットアップ
    sut = makeSUT();
  });

  describe('処理時間制限テスト', () => {
    test('通常のユーザープロフィール取得が500ms以内で完了する', async () => {
      // 【テスト目的】: 通常のユーザープロフィール取得処理が要求される性能要件（500ms以内）を満たすことを確認
      // 【テスト内容】: 標準的な条件でのプロフィール取得処理時間を測定し、制限時間内での完了を検証
      // 【期待される動作】: データベースアクセスを含む全処理が500ms以内で完了する
      // 🟢 信頼性レベル: 500ms以内の性能要件は要件定義で明確に規定されている

      // 【テストデータ準備】: パフォーマンステスト用の標準的なユーザーデータを作成
      // 【初期条件設定】: 通常の処理時間で応答するリポジトリモックを設定
      const user = UserProfileFactory.existingUser();
      const input = UserProfileFactory.validInput(user.id);

      // リポジトリモックの戻り値を設定（即座に解決）
      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(user);

      // 【実際の処理実行】: パフォーマンス測定を含むプロフィール取得処理の実行
      // 【処理内容】: 処理開始から完了までの時間を測定しながらUseCase実行
      const startTime = performance.now();
      await sut.sut.execute(input);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 【結果検証】: 処理時間が性能要件を満たしていることを確認
      // 【期待値確認】: 実際の処理時間が500ms以内であることを確認
      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime); // 【確認内容】: 処理が500ms以内で完了したことを確認 🟢
    });
  });

  describe('複数ユーザー連続処理パフォーマンス', () => {
    test('10人のユーザープロフィール連続取得が各々500ms以内で完了する', async () => {
      // 【テスト目的】: 複数ユーザーのプロフィールを連続取得する場合でも各処理が性能要件を満たすことを確認
      // 【テスト内容】: 10人のユーザーの連続プロフィール取得で各処理時間を測定し、全て制限時間内での完了を検証
      // 【期待される動作】: メモリ使用量や処理負荷が蓄積されても、各処理が500ms以内で完了する
      // 🟡 信頼性レベル: 連続処理での性能維持は要件定義から妥当な推測として実装

      // 【テストデータ準備】: 10人分のユーザーデータを作成し、連続処理用のテストデータを準備
      // 【初期条件設定】: 各ユーザーに対して通常の処理時間で応答するモックを設定
      const users = Array.from({ length: 10 }, (_, index) =>
        UserProfileFactory.existingUser({
          id: `uuid-performance-test-user-${index}`,
          email: `performance.test.${index}@example.com`,
          name: `パフォーマンステストユーザー${index}`,
        })
      );

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };

      // 【実際の処理実行】: 10人のユーザープロフィール連続取得処理の実行
      // 【処理内容】: 各ユーザーの処理時間を個別に測定しながら連続実行
      for (const user of users) {
        mockFindById.mockResolvedValue(user);
        const input = UserProfileFactory.validInput(user.id);

        const startTime = performance.now();
        await sut.sut.execute(input);
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // 【結果検証】: 各処理が性能要件を満たしていることを確認
        // 【期待値確認】: 連続処理でも各処理が500ms以内で完了することを確認
        GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime); // 【確認内容】: 連続処理の各処理が500ms以内で完了したことを確認 🟡
      }
    });
  });

  describe('大容量データパフォーマンス', () => {
    test('大容量プロフィールデータでも500ms以内で取得完了する', async () => {
      // 【テスト目的】: 大容量のプロフィールデータ（長い名前、大きなアバター画像URL等）でも性能要件を満たすことを確認
      // 【テスト内容】: 通常より大きなデータサイズのユーザー情報での処理時間を測定し、制限時間内での完了を検証
      // 【期待される動作】: データサイズによらず、処理時間が500ms以内に収まる
      // 🟡 信頼性レベル: 大容量データでの性能維持は要件定義から妥当な推測として実装

      // 【テストデータ準備】: 大容量データを含むユーザー情報を作成
      // 【初期条件設定】: 長い文字列や大きなURLを持つユーザーデータを準備
      const largeUser = UserProfileFactory.existingUser({
        name: 'テスト用の非常に長いユーザー名'.repeat(50), // 大容量の名前データ
        email: `very.long.email.address.for.performance.test${'a'.repeat(100)}@example.com`,
        avatarUrl: `https://example.com/very/long/path/to/avatar/image/${'path/'.repeat(50)}avatar.jpg`,
      });

      const input = UserProfileFactory.validInput(largeUser.id);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(largeUser);

      // 【実際の処理実行】: 大容量データでのプロフィール取得処理の実行
      // 【処理内容】: 大容量データの処理時間を測定しながらUseCase実行
      const startTime = performance.now();
      await sut.sut.execute(input);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 【結果検証】: 大容量データでも処理時間が性能要件を満たしていることを確認
      // 【期待値確認】: データサイズによらず処理が500ms以内で完了することを確認
      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime); // 【確認内容】: 大容量データでも処理が500ms以内で完了したことを確認 🟡
    });
  });

  describe('エラー処理パフォーマンス', () => {
    test('ユーザー未存在エラーも500ms以内で応答する', async () => {
      // 【テスト目的】: エラー処理においても性能要件（500ms以内）を満たすことを確認
      // 【テスト内容】: ユーザー未存在エラーの処理時間を測定し、制限時間内でのエラー応答を検証
      // 【期待される動作】: エラー処理パスでも500ms以内で適切なエラーレスポンスが返される
      // 🟡 信頼性レベル: エラー処理での性能要件は要件定義から妥当な推測として実装

      // 【テストデータ準備】: 存在しないユーザーIDを含む入力データを作成
      // 【初期条件設定】: リポジトリがnullを返すエラー状況を設定
      const nonExistentUserId = 'uuid-performance-error-test';
      const input = UserProfileFactory.validInput(nonExistentUserId);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(null);

      // 【実際の処理実行】: エラー処理の性能測定を含む処理実行
      // 【処理内容】: エラーハンドリングの処理時間を測定
      const startTime = performance.now();
      
      try {
        await sut.sut.execute(input);
      } catch {
        // エラーは期待される動作
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 【結果検証】: エラー処理でも性能要件を満たしていることを確認
      // 【期待値確認】: エラー処理が500ms以内で完了することを確認
      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime); // 【確認内容】: エラー処理が500ms以内で完了したことを確認 🟡
    });

    test('インフラエラーも500ms以内で応答する', async () => {
      // 【テスト目的】: インフラエラー処理においても性能要件（500ms以内）を満たすことを確認
      // 【テスト内容】: インフラエラーの処理時間を測定し、制限時間内でのエラー応答を検証
      // 【期待される動作】: インフラ障害時でも500ms以内で適切なエラーレスポンスが返される
      // 🟡 信頼性レベル: インフラエラー処理での性能要件は要件定義から妥当な推測として実装

      // 【テストデータ準備】: インフラエラーテスト用の入力データを作成
      // 【初期条件設定】: リポジトリがインフラエラーを発生させるよう設定
      const validInput = UserProfileFactory.validInput();

      const mockFindById = sut.userRepository.findById as unknown as {
        mockRejectedValue: (error: Error) => void;
      };
      const infraError = new Error('データベース接続エラー');
      mockFindById.mockRejectedValue(infraError);

      // 【実際の処理実行】: インフラエラー処理の性能測定を含む処理実行
      // 【処理内容】: インフラエラーハンドリングの処理時間を測定
      const startTime = performance.now();
      
      try {
        await sut.sut.execute(input);
      } catch {
        // エラーは期待される動作
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 【結果検証】: インフラエラー処理でも性能要件を満たしていることを確認
      // 【期待値確認】: インフラエラー処理が500ms以内で完了することを確認
      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime); // 【確認内容】: インフラエラー処理が500ms以内で完了したことを確認 🟡
    });
  });
});