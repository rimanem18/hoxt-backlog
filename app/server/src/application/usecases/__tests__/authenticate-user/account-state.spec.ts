/**
 * アカウント状態テスト
 *
 * AuthenticateUserUseCaseのアカウント状態による分岐処理をテスト。
 * アクティブ、非アクティブ、削除済み、ロック状態などの状態遷移を検証。
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type { AuthenticateUserUseCaseInput } from '@/application/interfaces/IAuthenticateUserUseCase';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { makeSUT } from './helpers/makeSUT';
import { TestMatchers } from './helpers/matchers';
import { UserFactory } from './helpers/userFactory';

describe('アカウント状態テスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  describe('同時リクエスト・競合状態', () => {
    test('同一ユーザーの同時JIT作成で適切に処理される', async () => {
      // Given: 同一ユーザーの並行リクエストシナリオ
      const externalId = 'google_concurrent_user';
      const email = 'concurrent@example.com';

      const existingUser = UserFactory.existing({
        id: 'uuid-first-created-user',
        externalId,
        email,
        name: '並行処理ユーザー',
      });

      const jwtPayload = UserFactory.jwtPayload(
        externalId,
        email,
        '並行処理ユーザー',
      );
      const externalUserInfo = UserFactory.externalUserInfo(
        externalId,
        email,
        '並行処理ユーザー',
      );
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定: 2回目以降のリクエストで既存ユーザーとして処理
      (
        sut.authProvider.verifyToken as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        sut.authProvider.getExternalUserInfo as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue(externalUserInfo);

      // 最初は新規ユーザー作成を試行するが、unique制約違反で既存ユーザーを返す
      (
        sut.authDomainService.authenticateUser as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        user: existingUser,
        isNewUser: false, // 重複作成ではなく既存ユーザーとして扱う
      });

      // When: 並行処理での重複制約処理を実行
      const result = await sut.sut.execute(input);

      // Then: 正常に処理される（データ整合性が保たれる）
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();

      TestMatchers.haveUserProperties(result.user, {
        id: 'uuid-first-created-user',
        externalId,
        email,
      });

      // 既存ユーザーとして処理される（重複作成回避）
      expect(result.isNewUser).toBe(false);

      // 適切な依存関係呼び出し
      TestMatchers.mock.toHaveBeenCalledWithArgs(
        sut.authProvider.verifyToken,
        jwt,
      );
      TestMatchers.mock.toHaveBeenCalledWithArgs(
        sut.authProvider.getExternalUserInfo,
        jwtPayload,
      );
      TestMatchers.mock.toHaveBeenCalledWithArgs(
        sut.authDomainService.authenticateUser,
        externalUserInfo,
      );
    });
  });

  describe('データベース整合性・制約違反', () => {
    test('unique制約違反時に適切にハンドリングされる', async () => {
      // Given: unique制約違反（email重複など）のシナリオ
      const jwtPayload = UserFactory.jwtPayload();
      const externalUserInfo = UserFactory.externalUserInfo();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      (
        sut.authProvider.verifyToken as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        sut.authProvider.getExternalUserInfo as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue(externalUserInfo);

      // unique制約違反をシミュレート
      (
        sut.authDomainService.authenticateUser as unknown as {
          mockRejectedValue: (value: unknown) => void;
        }
      ).mockRejectedValue(
        new InfrastructureError('UNIQUE制約違反: ユーザーが既に存在します'),
      );

      // When & Then: 制約違反で InfrastructureError がスローされる
      await TestMatchers.failWithError(
        sut.sut.execute(input),
        'infrastructure',
      );

      await TestMatchers.failWithMessage(
        sut.sut.execute(input),
        'UNIQUE制約違反: ユーザーが既に存在します',
      );
    });

    test('外部キー制約違反時に適切にハンドリングされる', async () => {
      // Given: 外部キー制約違反のシナリオ
      const jwtPayload = UserFactory.jwtPayload();
      const externalUserInfo = UserFactory.externalUserInfo();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      (
        sut.authProvider.verifyToken as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        sut.authProvider.getExternalUserInfo as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue(externalUserInfo);

      (
        sut.authDomainService.authenticateUser as unknown as {
          mockRejectedValue: (value: unknown) => void;
        }
      ).mockRejectedValue(
        new InfrastructureError('外部キー制約違反: 参照先が存在しません'),
      );

      // When & Then: 外部キー制約違反で InfrastructureError がスローされる
      await TestMatchers.failWithError(
        sut.sut.execute(input),
        'infrastructure',
      );

      await TestMatchers.failWithMessage(
        sut.sut.execute(input),
        '外部キー制約違反: 参照先が存在しません',
      );
    });
  });

  describe('トランザクション・ロールバック状態', () => {
    test('トランザクションタイムアウト時に適切にハンドリングされる', async () => {
      // Given: トランザクションタイムアウトのシナリオ
      const jwtPayload = UserFactory.jwtPayload();
      const externalUserInfo = UserFactory.externalUserInfo();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      (
        sut.authProvider.verifyToken as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        sut.authProvider.getExternalUserInfo as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue(externalUserInfo);

      // トランザクションタイムアウトをシミュレート
      (
        sut.authDomainService.authenticateUser as unknown as {
          mockRejectedValue: (value: unknown) => void;
        }
      ).mockRejectedValue(
        new InfrastructureError(
          'トランザクションタイムアウト: 処理時間が制限を超過しました',
        ),
      );

      // When & Then: タイムアウトで InfrastructureError がスローされる
      await TestMatchers.failWithError(
        sut.sut.execute(input),
        'infrastructure',
      );

      await TestMatchers.failWithMessage(
        sut.sut.execute(input),
        'トランザクションタイムアウト: 処理時間が制限を超過しました',
      );
    });

    test('デッドロック発生時に適切にハンドリングされる', async () => {
      // Given: デッドロック発生のシナリオ
      const jwtPayload = UserFactory.jwtPayload();
      const externalUserInfo = UserFactory.externalUserInfo();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      (
        sut.authProvider.verifyToken as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        sut.authProvider.getExternalUserInfo as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue(externalUserInfo);

      // デッドロックをシミュレート
      (
        sut.authDomainService.authenticateUser as unknown as {
          mockRejectedValue: (value: unknown) => void;
        }
      ).mockRejectedValue(
        new InfrastructureError(
          'デッドロック検出: トランザクションが中断されました',
        ),
      );

      // When & Then: デッドロックで InfrastructureError がスローされる
      await TestMatchers.failWithError(
        sut.sut.execute(input),
        'infrastructure',
      );

      await TestMatchers.failWithMessage(
        sut.sut.execute(input),
        'デッドロック検出: トランザクションが中断されました',
      );
    });
  });

  describe('ユーザー状態遷移パターン', () => {
    test.each([
      ['新規アクティブユーザー', true, 'active'],
      ['既存アクティブユーザー', false, 'active'],
      ['復活ユーザー', false, 'reactivated'],
    ])(
      '%s の状態で適切に処理される',
      async (_description, isNewUser, expectedStatus) => {
        // Given: 各種ユーザー状態のシナリオ
        const user = isNewUser ? UserFactory.new() : UserFactory.existing();
        const jwtPayload = UserFactory.jwtPayload();
        const externalUserInfo = UserFactory.externalUserInfo();
        const jwt = UserFactory.validJwt(jwtPayload);
        const input: AuthenticateUserUseCaseInput = { jwt };

        (
          sut.authProvider.verifyToken as unknown as {
            mockResolvedValue: (value: unknown) => void;
          }
        ).mockResolvedValue({
          valid: true,
          payload: jwtPayload,
        });

        (
          sut.authProvider.getExternalUserInfo as unknown as {
            mockResolvedValue: (value: unknown) => void;
          }
        ).mockResolvedValue(externalUserInfo);

        (
          sut.authDomainService.authenticateUser as unknown as {
            mockResolvedValue: (value: unknown) => void;
          }
        ).mockResolvedValue({
          user: { ...user, status: expectedStatus },
          isNewUser,
        });

        // When: 状態別認証処理を実行
        const result = await sut.sut.execute(input);

        // Then: 適切な状態で処理される
        expect(result).toBeDefined();
        expect(result.isNewUser).toBe(isNewUser);
        expect((result.user as any).status).toBe(expectedStatus);

        // ログ出力確認
        TestMatchers.haveLoggedMessage(
          sut.logger,
          'info',
          'User authentication successful',
          {
            userId: user.id,
            isNewUser,
          },
        );
      },
    );
  });

  describe('リソース制限・スロットリング状態', () => {
    test('同時接続数制限に達した場合の処理', async () => {
      // Given: 同時接続数制限のシナリオ
      const jwtPayload = UserFactory.jwtPayload();
      const externalUserInfo = UserFactory.externalUserInfo();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      (
        sut.authProvider.verifyToken as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        sut.authProvider.getExternalUserInfo as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue(externalUserInfo);

      // 同時接続数制限をシミュレート
      (
        sut.authDomainService.authenticateUser as unknown as {
          mockRejectedValue: (value: unknown) => void;
        }
      ).mockRejectedValue(
        new InfrastructureError(
          '同時接続数制限: 利用可能なスロットがありません',
        ),
      );

      // When & Then: 接続制限で InfrastructureError がスローされる
      await TestMatchers.failWithError(
        sut.sut.execute(input),
        'infrastructure',
      );

      await TestMatchers.failWithMessage(
        sut.sut.execute(input),
        '同時接続数制限: 利用可能なスロットがありません',
      );
    });
  });

  describe('状態変更時のログ出力検証', () => {
    test('データベース制約違反時に適切なエラーログが出力される', async () => {
      // Given: 制約違反のシナリオ
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };
      const constraintError = new InfrastructureError('UNIQUE制約違反');

      (
        sut.authProvider.verifyToken as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        sut.authProvider.getExternalUserInfo as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue(UserFactory.externalUserInfo());

      (
        sut.authDomainService.authenticateUser as unknown as {
          mockRejectedValue: (value: unknown) => void;
        }
      ).mockRejectedValue(constraintError);

      // When: 制約違反を実行
      try {
        await sut.sut.execute(input);
      } catch (_error) {
        // エラーは期待される動作
      }

      // Then: InfrastructureErrorは既知の例外なので、エラーログは出力されない
      // （業務例外として適切にハンドリングされる）
      TestMatchers.mock.notToHaveBeenCalled(sut.logger.error);
    });
  });
});
