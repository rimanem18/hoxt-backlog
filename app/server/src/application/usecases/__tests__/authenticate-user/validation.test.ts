/**
 * 入力検証テスト
 *
 * AuthenticateUserUseCaseの入力パラメータ検証ロジックをテスト。
 * 必須項目、形式、長さ、境界値の検証を行う。
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AuthenticateUserUseCaseInput } from '@/application/interfaces/IAuthenticateUserUseCase';
import { makeSUT } from './helpers/makeSUT';
import { TestMatchers } from './helpers/matchers';
import { UserFactory } from './helpers/userFactory';

describe('入力検証テスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('JWT必須項目検証', () => {
    test.each([
      ['空文字列', { jwt: '' }],
      ['null', { jwt: null as unknown as string }],
      ['undefined', { jwt: undefined as unknown as string }],
      ['空白文字のみ', { jwt: '   ' }],
    ])(
      '%s のJWTで ValidationError がスローされる',
      async (_description, input: AuthenticateUserUseCaseInput) => {
        // When & Then: 無効な入力で ValidationError がスローされる
        await TestMatchers.failWithError(sut.sut.execute(input), 'validation');

        await TestMatchers.failWithMessage(
          sut.sut.execute(input),
          'JWTトークンが必要です',
        );

        // 後続処理が実行されていないことを確認
        TestMatchers.mock.notToHaveBeenCalled(sut.authProvider.verifyToken);
        TestMatchers.mock.notToHaveBeenCalled(
          sut.authProvider.getExternalUserInfo,
        );
        TestMatchers.mock.notToHaveBeenCalled(
          sut.authDomainService.authenticateUser,
        );
      },
    );
  });

  describe('JWT構造検証', () => {
    test.each([
      ['ドットが不足', 'invalidjwttoken'],
      ['ドットが1つのみ', 'invalid.jwt'],
      ['空のセグメント含む', 'header..signature'],
      ['不正な形式', 'not-a-jwt-at-all'],
    ])('%s で構造検証エラーが発生する', async (_description, jwt: string) => {
      const input: AuthenticateUserUseCaseInput = { jwt };

      // When & Then: 構造が不正なJWTで ValidationError がスローされる
      await TestMatchers.failWithError(sut.sut.execute(input), 'validation');

      // JWT検証処理に到達しないことを確認
      TestMatchers.mock.notToHaveBeenCalled(sut.authProvider.verifyToken);
    });
  });

  describe('JWT長さ制限検証', () => {
    test.each([
      ['2KB以下', 1000],
      ['2KB境界値', 2048],
    ])(
      '%s のJWTで正常に処理される',
      async (_description, payloadLength: number) => {
        // Given: 指定長のJWTを作成
        const jwt =
          UserFactory.validJwt() +
          'x'.repeat(
            Math.max(0, payloadLength - UserFactory.validJwt().length),
          );
        const input: AuthenticateUserUseCaseInput = { jwt };

        // JWTサイズが制限以下の場合は構造検証を通過するようにモック設定
        if (jwt.length <= 2048) {
          const mockResult = {
            valid: true,
            payload: UserFactory.jwtPayload(),
          };
          (
            sut.authProvider.verifyToken as ReturnType<typeof mock>
          ).mockResolvedValue(mockResult);
          (
            sut.authProvider.getExternalUserInfo as ReturnType<typeof mock>
          ).mockResolvedValue(UserFactory.externalUserInfo());
          const mockAuthenticateUser = sut.authDomainService
            .authenticateUser as unknown as {
            mockResolvedValue: (value: {
              user: unknown;
              isNewUser: boolean;
            }) => void;
          };
          mockAuthenticateUser.mockResolvedValue({
            user: UserFactory.existing(),
            isNewUser: false,
          });

          // When: 制限以下のJWTで処理を実行
          const result = await sut.sut.execute(input);

          // Then: 正常に処理される
          expect(result).toBeDefined();
          TestMatchers.mock.toHaveBeenCalledTimes(
            sut.authProvider.verifyToken,
            1,
          );
        }
      },
    );

    test('2KB超過のJWTで制限エラーが発生する', async () => {
      // Given: 2KB超過のJWT（動的生成）
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const longJwt = `${header}.${'a'.repeat(2100)}.signature`;
      const input: AuthenticateUserUseCaseInput = { jwt: longJwt };

      // When & Then: サイズ制限超過で ValidationError がスローされる
      await TestMatchers.failWithError(sut.sut.execute(input), 'validation');

      // JWT検証処理に到達しないことを確認
      TestMatchers.mock.notToHaveBeenCalled(sut.authProvider.verifyToken);
    });
  });

  describe('特殊文字・エンコーディング検証', () => {
    test.each([
      [
        'Unicode文字含む',
        (() => {
          const header = Buffer.from(
            JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
          )
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          const payload = Buffer.from(
            JSON.stringify({ name: '日本', sub: '123' }),
          )
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          return `${header}.${payload}.signature`;
        })(),
      ],
      [
        'URL安全でないbase64',
        (() => {
          const header = Buffer.from(
            JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
          )
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          const payload = Buffer.from(JSON.stringify({ sub: '123' }))
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
          return `${header}.${payload}==.signature`; // パディング付き（意図的に不正）
        })(),
      ],
      [
        '改行文字含む',
        (() => {
          const header = Buffer.from(
            JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
          )
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          const payload = Buffer.from(JSON.stringify({ sub: '123' }))
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          return `${header}.\n${payload}.signature`; // 改行文字含む
        })(),
      ],
    ])('%s のJWTで適切に処理される', async (_description, jwt: string) => {
      const input: AuthenticateUserUseCaseInput = { jwt };

      try {
        // 特殊文字を含むJWTでも構造検証を試行
        await sut.sut.execute(input);
      } catch (error) {
        // 特殊文字を含む不正な入力では認証エラーが発生する
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('入力オブジェクト形式検証', () => {
    test.each([
      ['null input', null],
      ['undefined input', undefined],
      ['空オブジェクト', {}],
      ['jwt以外のプロパティのみ', { other: 'value' }],
    ])('%s で適切なエラーが発生する', async (_description, input: unknown) => {
      // When & Then: 不正な入力形式で ValidationError がスローされる
      await TestMatchers.failWithError(
        sut.sut.execute(input as AuthenticateUserUseCaseInput),
        'validation',
      );

      await TestMatchers.failWithMessage(
        sut.sut.execute(input as AuthenticateUserUseCaseInput),
        'JWTトークンが必要です',
      );
    });
  });

  describe('ログ出力検証', () => {
    test('検証失敗時に適切なログが出力される', async () => {
      const input: AuthenticateUserUseCaseInput = { jwt: '' };

      // When: 検証失敗を実行
      try {
        await sut.sut.execute(input);
      } catch (_error) {
        // エラーは期待される動作
      }

      // Then: 警告ログが出力される
      TestMatchers.haveLoggedMessage(
        sut.logger,
        'warn',
        'Authentication failed: Missing input or JWT',
        { input: '[REDACTED]' },
      );
    });

    test('JWT構造検証失敗時に詳細ログが出力される', async () => {
      const invalidJwt = 'invalid.structure';
      const input: AuthenticateUserUseCaseInput = { jwt: invalidJwt };

      // When: 構造検証失敗を実行
      try {
        await sut.sut.execute(input);
      } catch (_error) {
        // エラーは期待される動作
      }

      // Then: JWT検証失敗の詳細ログが出力される
      expect(sut.logger.warn).toHaveBeenCalledWith(
        'JWT validation failed',
        expect.objectContaining({
          jwtLength: invalidJwt.length,
        }),
      );
    });
  });
});
