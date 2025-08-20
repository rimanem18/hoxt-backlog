/**
 * 認証成功パステスト
 *
 * AuthenticateUserUseCaseの最短経路での正常系テスト。
 * 既存ユーザー認証とJIT新規ユーザー作成の成功パターンを検証。
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type { AuthenticateUserUseCaseInput } from '../../../interfaces/IAuthenticateUserUseCase';
import { makeSUT } from './helpers/makeSUT';
import { TestMatchers } from './helpers/matchers';
import { UserFactory } from './helpers/userFactory';

describe('認証成功パステスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  describe('既存ユーザー認証成功', () => {
    test('有効なJWTで既存ユーザーの認証が成功する', async () => {
      // Given: 既存ユーザーの認証フロー
      const existingUser = UserFactory.existing({
        id: 'uuid-existing-success',
        externalId: 'google_existing_user',
        email: 'existing@success.com',
        name: '既存成功ユーザー',
      });

      const jwtPayload = UserFactory.jwtPayload(
        'google_existing_user',
        'existing@success.com',
        '既存成功ユーザー',
      );

      const externalUserInfo = UserFactory.externalUserInfo(
        'google_existing_user',
        'existing@success.com',
        '既存成功ユーザー',
      );

      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定
      (sut.authProvider.verifyToken as any).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
        externalUserInfo,
      );

      (sut.authDomainService.authenticateUser as any).mockResolvedValue({
        user: existingUser,
        isNewUser: false,
      });

      // When: 認証処理を実行
      const result = await sut.sut.execute(input);

      // Then: 認証結果を検証
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.isNewUser).toBe(false);

      // ユーザー情報の検証
      TestMatchers.haveUserProperties(result.user, {
        id: 'uuid-existing-success',
        externalId: 'google_existing_user',
        email: 'existing@success.com',
        name: '既存成功ユーザー',
      });

      // 依存関係の呼び出し確認
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

      // 各関数が1回ずつ呼び出されることを確認
      TestMatchers.mock.toHaveBeenCalledTimes(sut.authProvider.verifyToken, 1);
      TestMatchers.mock.toHaveBeenCalledTimes(
        sut.authProvider.getExternalUserInfo,
        1,
      );
      TestMatchers.mock.toHaveBeenCalledTimes(
        sut.authDomainService.authenticateUser,
        1,
      );
    });
  });

  describe('新規ユーザーJIT作成成功', () => {
    test('有効なJWTで新規ユーザーのJIT作成が成功する', async () => {
      // Given: 新規ユーザーのJIT作成フロー
      const newUser = UserFactory.new({
        id: 'uuid-new-success',
        externalId: 'google_new_user',
        email: 'newuser@success.com',
        name: '新規成功ユーザー',
      });

      const jwtPayload = UserFactory.jwtPayload(
        'google_new_user',
        'newuser@success.com',
        '新規成功ユーザー',
      );

      const externalUserInfo = UserFactory.externalUserInfo(
        'google_new_user',
        'newuser@success.com',
        '新規成功ユーザー',
      );

      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定
      (sut.authProvider.verifyToken as any).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
        externalUserInfo,
      );

      (sut.authDomainService.authenticateUser as any).mockResolvedValue({
        user: newUser,
        isNewUser: true,
      });

      // When: JIT作成処理を実行
      const result = await sut.sut.execute(input);

      // Then: JIT作成結果を検証
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.isNewUser).toBe(true);

      // ユーザー情報の検証
      TestMatchers.haveUserProperties(result.user, {
        id: 'uuid-new-success',
        externalId: 'google_new_user',
        email: 'newuser@success.com',
        name: '新規成功ユーザー',
      });

      // 新規作成日時が現在時刻に近いことを確認
      TestMatchers.beRecentTime(result.user.createdAt);
      TestMatchers.beRecentTime(result.user.updatedAt);
      TestMatchers.beRecentTime(result.user.lastLoginAt!);

      // 依存関係の呼び出し確認
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

  describe('プロバイダー別成功パターン', () => {
    test.each([
      ['Google', 'google', 'google_user_123', 'user@gmail.com'],
      ['GitHub', 'github', 'github_user_456', 'user@github.com'],
      ['Facebook', 'facebook', 'facebook_user_789', 'user@facebook.com'],
    ])(
      '%s プロバイダーでの認証が成功する',
      async (_provider, providerType, externalId, email) => {
        // Given: プロバイダー別の認証フロー
        const user = UserFactory.existing({
          externalId,
          provider: providerType as any,
          email,
          name: `${_provider}ユーザー`,
        });

        const jwtPayload = UserFactory.jwtPayload(
          externalId,
          email,
          `${_provider}ユーザー`,
          providerType as any,
        );
        const externalUserInfo = UserFactory.externalUserInfo(
          externalId,
          email,
          `${_provider}ユーザー`,
          providerType as any,
        );
        const jwt = UserFactory.validJwt(jwtPayload);
        const input: AuthenticateUserUseCaseInput = { jwt };

        // モック設定
        (sut.authProvider.verifyToken as any).mockResolvedValue({
          valid: true,
          payload: jwtPayload,
        });

        (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
          externalUserInfo,
        );

        (sut.authDomainService.authenticateUser as any).mockResolvedValue({
          user,
          isNewUser: false,
        });

        // When: 認証処理を実行
        const result = await sut.sut.execute(input);

        // Then: 認証結果を検証
        expect(result).toBeDefined();
        expect(result.user.provider).toBe(providerType);
        expect(result.user.externalId).toBe(externalId);
        expect(result.user.email).toBe(email);
      },
    );
  });

  describe('成功時ログ出力検証', () => {
    test('既存ユーザー認証成功時に適切なログが出力される', async () => {
      // Given: 既存ユーザー認証の設定
      const user = UserFactory.existing();
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      (sut.authProvider.verifyToken as any).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });
      (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
        UserFactory.externalUserInfo(),
      );
      (sut.authDomainService.authenticateUser as any).mockResolvedValue({
        user,
        isNewUser: false,
      });

      // When: 認証処理を実行
      await sut.sut.execute(input);

      // Then: 成功ログが出力される
      TestMatchers.haveLoggedMessage(
        sut.logger,
        'info',
        'Starting user authentication',
        { jwtLength: jwt.length },
      );

      TestMatchers.haveLoggedMessage(
        sut.logger,
        'info',
        'User authentication successful',
        {
          userId: user.id,
          externalId: user.externalId,
          isNewUser: false,
        },
      );
    });

    test('新規ユーザーJIT作成成功時に適切なログが出力される', async () => {
      // Given: 新規ユーザーJIT作成の設定
      const newUser = UserFactory.new();
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      (sut.authProvider.verifyToken as any).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });
      (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
        UserFactory.externalUserInfo(),
      );
      (sut.authDomainService.authenticateUser as any).mockResolvedValue({
        user: newUser,
        isNewUser: true,
      });

      // When: JIT作成処理を実行
      await sut.sut.execute(input);

      // Then: 成功ログが出力される（新規ユーザー情報含む）
      TestMatchers.haveLoggedMessage(
        sut.logger,
        'info',
        'User authentication successful',
        {
          userId: newUser.id,
          externalId: newUser.externalId,
          isNewUser: true,
        },
      );
    });
  });
});
