/**
 * GetUserProfileUseCase 正常系テスト
 *
 * ユーザープロフィール取得機能の正常なフローを検証。
 * 既存ユーザーの情報取得成功パターンと関連するログ出力を確認。
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type { AuthProvider } from '@/domain/user/AuthProvider';
import { makeSUT } from './helpers/makeSUT';
import { GetUserProfileTestMatchers } from './helpers/matchers';
import { UserProfileFactory } from './helpers/userFactory';

describe('GetUserProfileUseCase 正常系テスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にSUT（テスト対象システム）を初期化
    // 【環境初期化】: 前のテストの影響を受けないよう、モック化された依存関係をクリーンな状態でセットアップ
    sut = makeSUT();
  });

  describe('ユーザープロフィール取得成功', () => {
    test('有効なuserIdでユーザープロフィールの取得が成功する', async () => {
      // 【テスト目的】: 有効なuserIdを入力として、既存ユーザーのプロフィール情報を正常に取得できることを確認
      // 【テスト内容】: userRepository.findById() が既存ユーザーを返し、UseCase が適切にユーザー情報を返却する処理をテスト
      // 【期待される動作】: 入力されたuserIdに対応するユーザーエンティティを含むレスポンスが返される
      // 🟢 信頼性レベル: TASK-106の要件定義に基づき、正常系の基本フローを忠実に実装

      // 【テストデータ準備】: リポジトリから返される既存ユーザーのモックデータを作成
      // 【初期条件設定】: 正常なユーザー検索が成功する前提でリポジトリモックを設定
      const existingUser = UserProfileFactory.existingUser({
        id: '12345678-1234-4321-abcd-123456789abc',
        externalId: 'google_test_user_123',
        email: 'test.user@example.com',
        name: 'テストユーザー',
      });

      const input = UserProfileFactory.validInput(
        '12345678-1234-4321-abcd-123456789abc',
      );

      // リポジトリモックの戻り値を設定
      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(existingUser);

      // 【実際の処理実行】: GetUserProfileUseCaseのexecuteメソッドを呼び出し
      // 【処理内容】: 依存関係としてモック化されたUserRepositoryを使用してユーザー検索処理を実行
      const result = await sut.sut.execute(input);

      // 【結果検証】: UseCase の実行結果が期待通りのユーザー情報を返すことを確認
      // 【期待値確認】: 返されたユーザーオブジェクトがリポジトリから取得したものと一致することを確認
      expect(result).toBeDefined(); // 【確認内容】: 結果が定義されていることを確認 🟢
      expect(result.user).toBeDefined(); // 【確認内容】: userプロパティが存在することを確認 🟢

      // ユーザー情報の詳細検証
      GetUserProfileTestMatchers.haveUserProperties(result.user, {
        id: '12345678-1234-4321-abcd-123456789abc',
        externalId: 'google_test_user_123',
        email: 'test.user@example.com',
        name: 'テストユーザー',
      }); // 【確認内容】: 返されたユーザーの各プロパティが期待値と一致することを確認 🟢

      // 依存関係の呼び出し確認
      GetUserProfileTestMatchers.mock.toHaveBeenCalledWithUserId(
        sut.userRepository.findById,
        '12345678-1234-4321-abcd-123456789abc',
      ); // 【確認内容】: リポジトリが正しいuserIdで呼び出されたことを確認 🟢

      GetUserProfileTestMatchers.mock.toHaveBeenCalledTimes(
        sut.userRepository.findById,
        1,
      ); // 【確認内容】: リポジトリが1回だけ呼び出されたことを確認 🟢
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
        // 【テスト目的】: 複数の認証プロバイダーに対応したユーザーのプロフィール取得が正常に動作することを確認
        // 【テスト内容】: 各プロバイダー（Google、GitHub、Facebook）のユーザーでプロフィール取得が成功する
        // 【期待される動作】: プロバイダーに関係なく、ユーザー情報が正常に取得される
        // 🟢 信頼性レベル: マルチプロバイダー対応は要件定義で明確に規定されている

        // 【テストデータ準備】: 各プロバイダー固有のユーザーデータを作成
        // 【初期条件設定】: プロバイダー固有の情報を持つユーザーエンティティを準備
        const user = UserProfileFactory.existingUser({
          externalId,
          provider: providerType as AuthProvider, // 型安全なキャストに変更
          email,
          name: `${_provider}ユーザー`,
        });

        const input = UserProfileFactory.validInput(user.id);

        const mockFindById = sut.userRepository.findById as unknown as {
          mockResolvedValue: (value: unknown) => void;
        };
        mockFindById.mockResolvedValue(user);

        // 【実際の処理実行】: プロバイダー別ユーザーのプロフィール取得処理
        // 【処理内容】: プロバイダーに関係なく統一されたUserIdでの検索処理を実行
        const result = await sut.sut.execute(input);

        // 【結果検証】: プロバイダー固有の情報が正しく返されることを確認
        // 【期待値確認】: 各プロバイダーのユーザー情報が適切に取得されることを確認
        expect(result).toBeDefined(); // 【確認内容】: 結果が定義されていることを確認 🟢
        expect(result.user.provider).toBe(providerType as AuthProvider); // 【確認内容】: プロバイダー情報が正しく設定されていることを確認 🟢
        expect(result.user.externalId).toBe(externalId); // 【確認内容】: 外部IDが正しく設定されていることを確認 🟢
        expect(result.user.email).toBe(email); // 【確認内容】: メールアドレスが正しく設定されていることを確認 🟢
      },
    );
  });

  describe('パフォーマンステスト', () => {
    test('ユーザープロフィール取得が500ms以内で完了する', async () => {
      // 【テスト目的】: ユーザープロフィール取得処理が性能要件（500ms以内）を満たすことを確認
      // 【テスト内容】: 処理時間を測定し、500ms以内で完了することを検証
      // 【期待される動作】: データベースアクセスを含む処理が制限時間内で完了する
      // 🟢 信頼性レベル: パフォーマンス要件500ms以内は要件定義で明確に規定されている

      // 【テストデータ準備】: パフォーマンステスト用のユーザーデータを準備
      // 【初期条件設定】: 通常の処理時間でレスポンスを返すモックを設定
      const user = UserProfileFactory.existingUser();
      const input = UserProfileFactory.validInput(user.id);

      const mockFindById = sut.userRepository.findById as unknown as {
        mockResolvedValue: (value: unknown) => void;
      };
      mockFindById.mockResolvedValue(user);

      // 【実際の処理実行】: パフォーマンス測定を含むプロフィール取得処理
      // 【処理内容】: 処理開始から完了までの時間を測定しながら実行
      const startTime = performance.now();
      await sut.sut.execute(input);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 【結果検証】: 処理時間が性能要件を満たしていることを確認
      // 【期待値確認】: 実際の実行時間が500ms以内であることを確認
      GetUserProfileTestMatchers.completeWithinTimeLimit(executionTime); // 【確認内容】: 処理が500ms以内で完了したことを確認 🟢
    });
  });

  describe('ログ出力検証', () => {
    test('ユーザープロフィール取得成功時に適切なログが出力される', async () => {
      // 【テスト目的】: 正常系処理において適切なログメッセージが出力されることを確認
      // 【テスト内容】: 処理開始・成功時のinfoレベルログが期待されるメタデータと共に出力される
      // 【期待される動作】: ログ出力により運用時の監視・デバッグが可能になる
      // 🟡 信頼性レベル: ログ出力の詳細仕様は要件定義では曖昧だが、運用上必要と推測

      // 【テストデータ準備】: ログ検証用のユーザーデータを準備
      // 【初期条件設定】: ログ出力を検証するためのモックロガーを設定
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

      // 【実際の処理実行】: ログ出力を含むプロフィール取得処理
      // 【処理内容】: ログ出力機能を持つUseCaseの実行
      await sut.sut.execute(input);

      // 【結果検証】: 期待されるログメッセージが出力されることを確認
      // 【期待値確認】: 処理開始・成功時のログが適切なメタデータと共に出力されることを確認
      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'info',
        'User profile retrieval started',
        { userId: '12345678-1234-4321-abcd-123456789abc' },
      ); // 【確認内容】: 処理開始ログが適切なuserIdメタデータと共に出力されることを確認 🟡

      GetUserProfileTestMatchers.haveLoggedMessage(
        sut.logger,
        'info',
        'User profile retrieved successfully',
        { userId: '12345678-1234-4321-abcd-123456789abc' },
      ); // 【確認内容】: 処理成功ログが適切なuserIdメタデータと共に出力されることを確認 🟡
    });
  });
});
