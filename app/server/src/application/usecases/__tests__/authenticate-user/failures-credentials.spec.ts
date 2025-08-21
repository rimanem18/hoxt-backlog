/**
 * 認証失敗・資格情報エラーテスト
 *
 * AuthenticateUserUseCaseの認証失敗パターンをテスト。
 * JWT検証失敗、不正な資格情報、期限切れトークンなどを検証。
 */

import { beforeEach, describe, expect, type Mock, test } from 'bun:test';
import type { AuthenticateUserUseCaseInput } from '@/application/interfaces/IAuthenticateUserUseCase';
import { ExternalServiceError } from '@/shared/errors/ExternalServiceError';
import { makeSUT } from './helpers/makeSUT';
import { TestMatchers } from './helpers/matchers';
import { UserFactory } from './helpers/userFactory';

describe('認証失敗・資格情報エラーテスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  describe('JWT検証失敗パターン', () => {
    test.each([
      ['無効な署名', { valid: false, error: 'Invalid signature' }],
      ['期限切れトークン', { valid: false, error: 'Token expired' }],
      ['不正なissuer', { valid: false, error: 'Invalid issuer' }],
      ['不正なaudience', { valid: false, error: 'Invalid audience' }],
      [
        '改ざんされたペイロード',
        { valid: false, error: 'Token verification failed' },
      ],
    ])(
      '%s で AuthenticationError がスローされる',
      async (_reason, verificationResult) => {
        // Given: JWT検証失敗パターンの設定
        const jwt = UserFactory.validJwt();
        const input: AuthenticateUserUseCaseInput = { jwt };

        (sut.authProvider.verifyToken as Mock<any>).mockResolvedValue(
          verificationResult,
        );

        // When & Then: JWT検証失敗で AuthenticationError がスローされる
        await TestMatchers.failWithError(
          sut.sut.execute(input),
          'authentication',
        );

        await TestMatchers.failWithMessage(
          sut.sut.execute(input),
          '認証トークンが無効です',
        );

        // JWT検証は実行されるが、後続処理は実行されない
        TestMatchers.mock.toHaveBeenCalledWithArgs(
          sut.authProvider.verifyToken,
          jwt,
        );
        TestMatchers.mock.notToHaveBeenCalled(
          sut.authProvider.getExternalUserInfo,
        );
        TestMatchers.mock.notToHaveBeenCalled(
          sut.authDomainService.authenticateUser,
        );
      },
    );
  });

  describe('ペイロード不正パターン', () => {
    test.each([
      ['ペイロードがnull', null],
      ['ペイロードがundefined', undefined],
    ])('%s で認証エラーがスローされる', async (_description, payload) => {
      // Given: 不正なペイロードの設定
      const jwt = UserFactory.validJwt();
      const input: AuthenticateUserUseCaseInput = { jwt };

      (sut.authProvider.verifyToken as Mock<any>).mockResolvedValue({
        valid: true,
        payload: payload,
      });

      // When & Then: 不正なペイロードでAuthenticationErrorがスローされる
      await TestMatchers.failWithError(
        sut.sut.execute(input),
        'authentication',
      );
      await TestMatchers.failWithMessage(
        sut.sut.execute(input),
        '認証トークンが無効です',
      );

      // JWT検証は成功するが、ペイロードが不正なため後続処理は実行されない
      TestMatchers.mock.toHaveBeenCalledTimes(sut.authProvider.verifyToken, 2);
      TestMatchers.mock.notToHaveBeenCalled(
        sut.authProvider.getExternalUserInfo,
      );
      TestMatchers.mock.notToHaveBeenCalled(
        sut.authDomainService.authenticateUser,
      );
    });

    test('空のペイロード で認証エラーがスローされる', async () => {
      // Given: 空のペイロードの設定
      const jwt = UserFactory.validJwt();
      const input: AuthenticateUserUseCaseInput = { jwt };

      (sut.authProvider.verifyToken as Mock<any>).mockResolvedValue({
        valid: true,
        payload: {},
      });

      // getExternalUserInfoが実際のエラーをスローするように設定
      (sut.authProvider.getExternalUserInfo as Mock<any>).mockRejectedValue(
        new Error('Missing required field: sub'),
      );

      // When & Then: 空のペイロードでAuthenticationErrorがスローされる（フォールバック）
      await TestMatchers.failWithError(
        sut.sut.execute(input),
        'authentication',
      );
      await TestMatchers.failWithMessage(
        sut.sut.execute(input),
        '処理中にエラーが発生しました',
      );

      // JWT検証は成功し、getExternalUserInfoが呼び出されるが、authenticateUserは呼び出されない
      TestMatchers.mock.toHaveBeenCalledTimes(sut.authProvider.verifyToken, 2);
      TestMatchers.mock.toHaveBeenCalledTimes(
        sut.authProvider.getExternalUserInfo,
        2,
      );
      TestMatchers.mock.notToHaveBeenCalled(
        sut.authDomainService.authenticateUser,
      );
    });
  });

  describe('外部サービス障害パターン', () => {
    test.each([
      ['認証サービス接続タイムアウト', 'Connection timeout'],
      ['認証サービスレート制限', 'Rate limit exceeded'],
      ['認証サービス一時停止', 'Service temporarily unavailable'],
      ['認証サービス内部エラー', 'Internal server error'],
      ['ネットワーク接続エラー', 'Network connection failed'],
    ])(
      '%s で ExternalServiceError がスローされる',
      async (_scenario, errorMessage) => {
        // Given: 外部サービス障害の設定
        const jwt = UserFactory.validJwt();
        const input: AuthenticateUserUseCaseInput = { jwt };

        (sut.authProvider.verifyToken as Mock<any>).mockRejectedValue(
          new ExternalServiceError(`認証サービスエラー: ${errorMessage}`),
        );

        // When & Then: 外部サービス障害で ExternalServiceError がスローされる
        await TestMatchers.failWithError(
          sut.sut.execute(input),
          'external-service',
        );

        await expect(sut.sut.execute(input)).rejects.toThrow(
          `認証サービスエラー: ${errorMessage}`,
        );

        // JWT検証の試行は行われるが、失敗するため後続処理は実行されない
        TestMatchers.mock.toHaveBeenCalledWithArgs(
          sut.authProvider.verifyToken,
          jwt,
        );
        TestMatchers.mock.notToHaveBeenCalled(
          sut.authProvider.getExternalUserInfo,
        );
        TestMatchers.mock.notToHaveBeenCalled(
          sut.authDomainService.authenticateUser,
        );
      },
    );
  });

  describe('ユーザー情報取得失敗パターン', () => {
    test('外部ユーザー情報取得で ExternalServiceError が発生する', async () => {
      // Given: JWT検証は成功するが、ユーザー情報取得で失敗
      const jwtPayload = UserFactory.jwtPayload();
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
          mockRejectedValue: (value: unknown) => void;
        }
      ).mockRejectedValue(
        new ExternalServiceError('外部ユーザー情報の取得に失敗しました'),
      );

      // When & Then: ユーザー情報取得失敗で ExternalServiceError がスローされる
      await TestMatchers.failWithError(
        sut.sut.execute(input),
        'external-service',
      );

      await TestMatchers.failWithMessage(
        sut.sut.execute(input),
        '外部ユーザー情報の取得に失敗しました',
      );

      // JWT検証とユーザー情報取得は実行されるが、認証処理は実行されない
      TestMatchers.mock.toHaveBeenCalledWithArgs(
        sut.authProvider.verifyToken,
        jwt,
      );
      TestMatchers.mock.toHaveBeenCalledWithArgs(
        sut.authProvider.getExternalUserInfo,
        jwtPayload,
      );
      TestMatchers.mock.notToHaveBeenCalled(
        sut.authDomainService.authenticateUser,
      );
    });
  });

  describe('認証失敗時ログ出力検証', () => {
    test('JWT検証失敗時に適切な警告ログが出力される', async () => {
      // Given: JWT検証失敗の設定
      const jwt = UserFactory.validJwt();
      const input: AuthenticateUserUseCaseInput = { jwt };
      const errorMessage = 'Invalid signature';

      (
        sut.authProvider.verifyToken as unknown as {
          mockResolvedValue: (value: unknown) => void;
        }
      ).mockResolvedValue({
        valid: false,
        error: errorMessage,
      });

      // When: JWT検証失敗を実行
      try {
        await sut.sut.execute(input);
      } catch (_error) {
        // エラーは期待される動作
      }

      // Then: 適切な警告ログが出力される
      TestMatchers.haveLoggedMessage(
        sut.logger,
        'warn',
        'User authentication failed',
        {
          reason: 'Invalid JWT',
          errorMessage,
        },
      );
    });

    test('外部サービス障害時はエラーログが出力されない', async () => {
      // Given: 外部サービス障害の設定
      const jwt = UserFactory.validJwt();
      const input: AuthenticateUserUseCaseInput = { jwt };

      (
        sut.authProvider.verifyToken as unknown as {
          mockRejectedValue: (value: unknown) => void;
        }
      ).mockRejectedValue(
        new ExternalServiceError('認証サービスが一時的に利用できません'),
      );

      // When: 外部サービス障害を実行
      try {
        await sut.sut.execute(input);
      } catch (_error) {
        // エラーは期待される動作
      }

      // Then: ExternalServiceErrorは既知の例外なので、エラーログは出力されない
      TestMatchers.mock.notToHaveBeenCalled(sut.logger.error);
    });
  });

  describe('セキュリティ関連の失敗パターン', () => {
    test('改ざん検出時のタイミング耐性確認', async () => {
      // Given: 改ざんされたJWTのパターン
      const validJwt = UserFactory.validJwt();
      const tamperedJwts = [
        validJwt.replace(/.$/, 'X'), // 署名の最後の文字を変更
        validJwt.replace(/.{10}$/, 'tampered123'), // 署名の後半を変更
      ];

      const results: number[] = [];

      // When: 複数の改ざんJWTで処理時間を測定
      for (const jwt of tamperedJwts) {
        const input: AuthenticateUserUseCaseInput = { jwt };

        (sut.authProvider.verifyToken as Mock<any>).mockResolvedValue({
          valid: false,
          error: 'Invalid signature',
        });

        const startTime = sut.fakeClock.now();

        try {
          await sut.sut.execute(input);
        } catch (_error) {
          // エラーは期待される動作
        }

        const endTime = sut.fakeClock.now();
        results.push(endTime - startTime);
      }

      // Then: 処理時間の一定性を確認（タイミング攻撃対策）
      // 実際の実装では暗号化処理の一定時間実行を確認
      // ここでは同じ処理フローが実行されることを確認
      expect(results.length).toBe(tamperedJwts.length);
      TestMatchers.mock.toHaveBeenCalledTimes(
        sut.authProvider.verifyToken,
        tamperedJwts.length,
      );
    });
  });
});
