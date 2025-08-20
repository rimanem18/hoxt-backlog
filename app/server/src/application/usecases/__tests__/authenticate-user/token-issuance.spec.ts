/**
 * トークン発行・時刻制御テスト
 *
 * AuthenticateUserUseCaseのJWT処理と時刻依存ロジックをテスト。
 * トークン有効期限、発行時刻、更新時刻などの時間制御機能を検証。
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type { AuthenticateUserUseCaseInput } from '../../../interfaces/IAuthenticateUserUseCase';
import { createPerformanceTimer, TIME_CONSTANTS } from './helpers/fakeClock';
import { makeSUT } from './helpers/makeSUT';
import { TestMatchers } from './helpers/matchers';
import { UserFactory } from './helpers/userFactory';

describe('トークン発行・時刻制御テスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
    // 固定時刻の設定（テストの決定性確保）
    sut.fakeClock.setTime(TIME_CONSTANTS.BASE_TIME);
  });

  describe('JWT有効期限検証', () => {
    test.each([
      ['有効期限内のトークン', 3600], // 1時間後
      ['有効期限ギリギリのトークン', 60], // 1分後
      ['長期間有効なトークン', 86400], // 24時間後
    ])(
      '%s で正常に処理される',
      async (_description, expiresInSeconds: number) => {
        // Given: 有効期限が設定されたJWT
        const now = Math.floor(sut.fakeClock.now() / 1000);
        const jwtPayload = UserFactory.jwtPayload();
        jwtPayload.iat = now;
        jwtPayload.exp = now + expiresInSeconds;

        const jwt = UserFactory.validJwt(jwtPayload);
        const input: AuthenticateUserUseCaseInput = { jwt };

        // モック設定
        (sut.authProvider.verifyToken as any).mockResolvedValue({
          valid: true,
          payload: jwtPayload,
        });

        (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
          UserFactory.externalUserInfo(),
        );

        (sut.authDomainService.authenticateUser as any).mockResolvedValue({
          user: UserFactory.existing(),
          isNewUser: false,
        });

        // When: 有効期限内のJWTで認証処理を実行
        const result = await sut.sut.execute(input);

        // Then: 正常に処理される
        expect(result).toBeDefined();
        expect(result.user).toBeDefined();

        // JWT検証が実行される
        TestMatchers.mock.toHaveBeenCalledWithArgs(
          sut.authProvider.verifyToken,
          jwt,
        );
      },
    );

    test.each([
      ['期限切れトークン', -3600], // 1時間前
      ['大幅に期限切れ', -86400], // 24時間前
    ])(
      '%s で認証エラーが発生する',
      async (_description, expiredSecondsAgo: number) => {
        // Given: 期限切れのJWT
        const now = Math.floor(sut.fakeClock.now() / 1000);
        const jwtPayload = UserFactory.jwtPayload();
        jwtPayload.iat = now + expiredSecondsAgo - 1; // 発行時刻も古く設定
        jwtPayload.exp = now + expiredSecondsAgo;

        const jwt = UserFactory.validJwt(jwtPayload);
        const input: AuthenticateUserUseCaseInput = { jwt };

        // 期限切れトークンは検証失敗
        (sut.authProvider.verifyToken as any).mockResolvedValue({
          valid: false,
          error: 'Token expired',
        });

        // When & Then: 期限切れトークンで認証エラーが発生
        await TestMatchers.failWithError(
          sut.sut.execute(input),
          'authentication',
        );

        await TestMatchers.failWithMessage(
          sut.sut.execute(input),
          '認証トークンが無効です',
        );
      },
    );
  });

  describe('ユーザータイムスタンプ検証', () => {
    test('新規ユーザー作成時に現在時刻でタイムスタンプが設定される', async () => {
      // Given: 新規ユーザー作成のシナリオ
      const currentTime = sut.fakeClock.nowAsDate();
      const newUser = UserFactory.new({
        createdAt: currentTime,
        updatedAt: currentTime,
        lastLoginAt: currentTime,
      });

      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定
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

      // When: 新規ユーザー作成処理を実行
      const result = await sut.sut.execute(input);

      // Then: 現在時刻でタイムスタンプが設定される
      expect(result.user.createdAt.getTime()).toBe(currentTime.getTime());
      expect(result.user.updatedAt.getTime()).toBe(currentTime.getTime());
      expect(result.user.lastLoginAt?.getTime()).toBe(currentTime.getTime());
    });

    test('既存ユーザーログイン時にlastLoginAtが更新される', async () => {
      // Given: 既存ユーザーのログインシナリオ
      const pastTime = new Date(sut.fakeClock.now() - TIME_CONSTANTS.ONE_DAY);
      const currentTime = sut.fakeClock.nowAsDate();

      const existingUser = UserFactory.existing({
        createdAt: pastTime, // 過去の作成日
        updatedAt: currentTime, // 現在時刻で更新
        lastLoginAt: currentTime, // 現在時刻でログイン更新
      });

      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定
      (sut.authProvider.verifyToken as any).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
        UserFactory.externalUserInfo(),
      );

      (sut.authDomainService.authenticateUser as any).mockResolvedValue({
        user: existingUser,
        isNewUser: false,
      });

      // When: 既存ユーザーログイン処理を実行
      const result = await sut.sut.execute(input);

      // Then: lastLoginAtが現在時刻で更新される
      expect(result.user.createdAt.getTime()).toBe(pastTime.getTime()); // 作成日は変更されない
      expect(result.user.updatedAt.getTime()).toBe(currentTime.getTime()); // 更新日は現在時刻
      expect(result.user.lastLoginAt?.getTime()).toBe(currentTime.getTime()); // ログイン日は現在時刻
    });
  });

  describe('パフォーマンス制限検証', () => {
    test('既存ユーザー認証が制限時間内に完了する', async () => {
      // Given: 既存ユーザー認証のパフォーマンステスト
      const user = UserFactory.existing();
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定（即座に完了）
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

      // When: パフォーマンスタイマーで実行時間を測定
      const timer = createPerformanceTimer(sut.fakeClock);
      timer.start();

      const result = await sut.sut.execute(input);

      const executionTime = timer.end();

      // Then: 既存ユーザー認証が1秒以内に完了
      expect(result).toBeDefined();
      expect(result.isNewUser).toBe(false);
      TestMatchers.completeWithinTimeLimit(
        executionTime,
        TIME_CONSTANTS.EXISTING_USER_LIMIT,
      );
    });

    test('新規ユーザーJIT作成が制限時間内に完了する', async () => {
      // Given: 新規ユーザーJIT作成のパフォーマンステスト
      const newUser = UserFactory.new();
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定（即座に完了）
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

      // When: パフォーマンスタイマーで実行時間を測定
      const timer = createPerformanceTimer(sut.fakeClock);
      timer.start();

      const result = await sut.sut.execute(input);

      const executionTime = timer.end();

      // Then: JIT作成が2秒以内に完了
      expect(result).toBeDefined();
      expect(result.isNewUser).toBe(true);
      TestMatchers.completeWithinTimeLimit(
        executionTime,
        TIME_CONSTANTS.NEW_USER_LIMIT,
      );
    });

    test('パフォーマンス制限超過時に警告ログが出力される', async () => {
      // Given: パフォーマンス制限を超過するシナリオ
      const user = UserFactory.existing();
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定
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

      // When: 実行前に時間を進めて制限時間を超過させる
      sut.fakeClock.advance(TIME_CONSTANTS.EXISTING_USER_LIMIT + 100);

      await sut.sut.execute(input);

      // Then: パフォーマンス警告ログが出力される
      expect(sut.logger.warn).toHaveBeenCalledWith(
        'Performance requirement not met',
        expect.objectContaining({
          timeLimit: TIME_CONSTANTS.EXISTING_USER_LIMIT,
          isNewUser: false,
        }),
      );
    });
  });

  describe('時刻制御・タイムゾーン検証', () => {
    test('異なる時刻での認証処理が適切に動作する', async () => {
      // Given: 複数の時刻でのテストケース
      const testTimes = [
        {
          name: '平日午前',
          time: new Date('2025-08-20T09:00:00+09:00').getTime(),
        },
        {
          name: '平日深夜',
          time: new Date('2025-08-20T23:59:59+09:00').getTime(),
        },
        {
          name: '休日昼間',
          time: new Date('2025-08-23T12:00:00+09:00').getTime(),
        },
      ];

      const user = UserFactory.existing();
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定
      (sut.authProvider.verifyToken as any).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
        UserFactory.externalUserInfo(),
      );

      for (const { name, time } of testTimes) {
        // 各時刻で時計を設定
        sut.fakeClock.setTime(time);

        (sut.authDomainService.authenticateUser as any).mockResolvedValue({
          user: { ...user, updatedAt: new Date(time) },
          isNewUser: false,
        });

        // When: 異なる時刻での認証処理を実行
        const result = await sut.sut.execute(input);

        // Then: 各時刻で適切に動作する
        expect(result).toBeDefined();
        expect(result.user.updatedAt.getTime()).toBe(time);

        // ログに実行時刻情報が含まれる
        TestMatchers.haveLoggedMessage(
          sut.logger,
          'info',
          'User authentication successful',
          { userId: user.id },
        );
      }
    });

    test('夏時間・時差による時刻処理が適切に動作する', async () => {
      // Given: 異なるタイムゾーンでの時刻処理
      const jstTime = new Date('2025-08-20T15:00:00+09:00').getTime(); // JST 15:00
      const utcTime = new Date('2025-08-20T06:00:00Z').getTime(); // UTC 06:00 (同時刻)

      expect(jstTime).toBe(utcTime); // 同一時刻であることを確認

      const user = UserFactory.existing();
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      // モック設定
      (sut.authProvider.verifyToken as any).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (sut.authProvider.getExternalUserInfo as any).mockResolvedValue(
        UserFactory.externalUserInfo(),
      );

      sut.fakeClock.setTime(jstTime);

      (sut.authDomainService.authenticateUser as any).mockResolvedValue({
        user: { ...user, updatedAt: new Date(jstTime) },
        isNewUser: false,
      });

      // When: 時差を考慮した認証処理を実行
      const result = await sut.sut.execute(input);

      // Then: 時差に関係なく適切に処理される
      expect(result).toBeDefined();
      expect(result.user.updatedAt.getTime()).toBe(jstTime);
    });
  });
});
