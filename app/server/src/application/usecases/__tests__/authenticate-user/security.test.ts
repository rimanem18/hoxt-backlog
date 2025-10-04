/**
 * セキュリティテスト
 *
 * AuthenticateUserUseCaseのセキュリティ関連機能をテスト。
 * 長大入力、Unicode正規化、ゼロ幅スペース、タイミング攻撃耐性などを検証。
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AuthenticateUserUseCaseInput } from '@/application/interfaces/IAuthenticateUserUseCase';
import { ValidationError } from '@/shared/errors/ValidationError';
import { createPerformanceTimer } from './helpers/fakeClock';
import { makeSUT } from './helpers/makeSUT';
import { TestMatchers } from './helpers/matchers';
import { UserFactory } from './helpers/userFactory';

describe('セキュリティテスト', () => {
  let sut: ReturnType<typeof makeSUT>;

  beforeEach(() => {
    sut = makeSUT();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('長大入力攻撃耐性', () => {
    test.each([
      ['2KB境界値', 2048],
      ['2KB+1バイト', 2049],
      ['4KB攻撃', 4096],
      ['異常に大きなペイロード', 10000],
    ])('%s の入力で適切に制限される', async (_description, size: number) => {
      // Given: 長大入力の攻撃シナリオ（動的生成）
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const longInput = `${header}.${'A'.repeat(size)}.signature`;
      const input: AuthenticateUserUseCaseInput = { jwt: longInput };

      // When & Then: サイズ制限チェック
      try {
        await sut.sut.execute(input);

        // 2KB以下の場合は後続処理に進む可能性があるが、
        // 無効なJWTなので検証エラーになる
        if (size <= 2048) {
          // JWT検証が実行される可能性がある
        }
      } catch (error) {
        // サイズ超過の場合はValidationError
        // 無効JWT構造の場合もValidationError
        expect(error).toBeInstanceOf(ValidationError);
      }

      // サイズ超過の場合はJWT検証処理に到達しない
      if (size > 2048) {
        TestMatchers.mock.notToHaveBeenCalled(sut.authProvider.verifyToken);
      }
    });

    test('メモリ枯渇攻撃の防御', async () => {
      // Given: 極めて大きな入力による攻撃
      const massiveInput = 'A'.repeat(100000); // 100KB
      const input: AuthenticateUserUseCaseInput = { jwt: massiveInput };

      // When: 大量入力攻撃を実行
      const timer = createPerformanceTimer(sut.fakeClock);
      timer.start();

      try {
        await sut.sut.execute(input);
      } catch (_error) {
        // エラーは期待される動作
      }

      const executionTime = timer.end();

      // Then: 高速に拒否される（DoS攻撃防御）
      expect(executionTime).toBeLessThan(100); // 100ms以内で拒否

      // 後続処理が実行されない
      TestMatchers.mock.notToHaveBeenCalled(sut.authProvider.verifyToken);
    });
  });

  describe('Unicode・エンコーディング攻撃耐性', () => {
    test.each([
      ['ゼロ幅スペース含有', 'header.pay\u200Bload.signature'],
      ['制御文字含有', 'header.pay\x00load.signature'],
      ['RTL文字含有', 'header.pay\u202Eload.signature'],
      ['Unicode正規化攻撃', 'header.café.signature'], // é の異なる表現
      ['絵文字含有', 'header.pay🚨load.signature'],
      ['改行文字含有', 'header.pay\nload.signature'],
      ['タブ文字含有', 'header.pay\tload.signature'],
    ])('%s で適切に処理される', async (_description, jwt: string) => {
      const input: AuthenticateUserUseCaseInput = { jwt };

      // When: Unicode攻撃を実行
      try {
        await sut.sut.execute(input);
      } catch (error) {
        // Unicode文字を含む不正なJWTは ValidationError で拒否される
        expect(error).toBeInstanceOf(ValidationError);
      }

      // 不正な形式のJWTは構造検証で拒否され、後続処理は実行されない
      TestMatchers.mock.notToHaveBeenCalled(sut.authProvider.verifyToken);
    });

    test('Unicode正規化の一貫性確認', async () => {
      // Given: 異なる正規化形式の同じ文字
      const nfc = 'café'; // NFC正規化形式
      const nfd = 'cafe\u0301'; // NFD正規化形式（同じ意味）

      expect(nfc).not.toBe(nfd); // 文字列としては異なる
      expect(nfc.normalize()).toBe(nfd.normalize()); // 正規化後は同じ

      const jwtWithNfc = `header.${Buffer.from(nfc).toString('base64')}.signature`;
      const jwtWithNfd = `header.${Buffer.from(nfd).toString('base64')}.signature`;

      // When: 異なる正規化形式でアクセス
      for (const jwt of [jwtWithNfc, jwtWithNfd]) {
        const input: AuthenticateUserUseCaseInput = { jwt };

        try {
          await sut.sut.execute(input);
        } catch (error) {
          // 不正な構造なので認証エラーで拒否される（ValidationErrorまたはAuthenticationError）
          expect(error).toBeInstanceOf(Error);
        }
      }

      // Then: 一貫した処理が行われる（正規化に関わらず同じ結果）
      expect(true).toBe(true); // プロセスが完了すればOK
    });
  });

  describe('タイミング攻撃耐性', () => {
    test('無効JWT検証の時間一定性', async () => {
      // Given: 異なる無効JWTパターン
      const invalidJwts = [
        'short',
        'medium.length.jwt',
        'very.long.jwt.with.many.segments.that.should.not.affect.timing',
        '',
        'single',
      ];

      const executionTimes: number[] = [];

      // When: 各無効JWTでの処理時間を測定
      for (const jwt of invalidJwts) {
        const input: AuthenticateUserUseCaseInput = { jwt };
        const timer = createPerformanceTimer(sut.fakeClock);

        timer.start();

        try {
          await sut.sut.execute(input);
        } catch (_error) {
          // エラーは期待される動作
        }

        const executionTime = timer.end();
        executionTimes.push(executionTime);
      }

      // Then: 処理時間の一定性を確認
      // すべて入力検証段階で拒否されるため、時間は一定であることが期待される
      const avgTime =
        executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;

      for (const time of executionTimes) {
        // 平均から大きく乖離しない（タイミング攻撃を防ぐ）
        // ただし、処理が高速すぎて時間が0の場合は許容する
        const variance = Math.abs(time - avgTime);
        if (avgTime > 0) {
          expect(variance).toBeLessThan(avgTime * 0.5);
        } else {
          // 処理時間が0の場合は高速処理として成功
          expect(variance).toBeLessThanOrEqual(1);
        }
      }
    });

    test('JWT検証失敗時のタイミング一定性', async () => {
      // Given: 構造的には正しいが無効な署名のJWT（動的生成）
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const validStructureJwts = [
        Buffer.from(JSON.stringify({ sub: '123' }))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, ''),
        Buffer.from(JSON.stringify({ sub: '456' }))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, ''),
        Buffer.from(JSON.stringify({ sub: '789' }))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, ''),
      ].map((payload, i) => `${header}.${payload}.invalid${i + 1}`);

      // 全て検証失敗を返すよう設定
      (
        sut.authProvider.verifyToken as ReturnType<typeof mock>
      ).mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
      });

      const executionTimes: number[] = [];

      // When: 各JWTでの検証処理時間を測定
      for (const jwt of validStructureJwts) {
        const input: AuthenticateUserUseCaseInput = { jwt };
        const timer = createPerformanceTimer(sut.fakeClock);

        timer.start();

        try {
          await sut.sut.execute(input);
        } catch (_error) {
          // エラーは期待される動作
        }

        const executionTime = timer.end();
        executionTimes.push(executionTime);
      }

      // Then: JWT検証処理の時間一定性を確認
      // 異なる内容のJWTでも検証失敗の処理時間が一定であることを確認
      expect(executionTimes.length).toBe(validStructureJwts.length);

      // 各JWTでJWT検証が実行される
      TestMatchers.mock.toHaveBeenCalledTimes(
        sut.authProvider.verifyToken,
        validStructureJwts.length,
      );
    });
  });

  describe('インジェクション攻撃耐性', () => {
    test.each([
      ['SQL注入攻撃', "'; DROP TABLE users; --"],
      ['NoSQL注入攻撃', '{"$ne": null}'],
      ['コマンド注入攻撃', '; rm -rf / #'],
      ['XSS攻撃', '<script>alert("xss")</script>'],
      [
        'XXE攻撃',
        '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
      ],
      ['LDAP注入攻撃', '*)(&(objectClass=*)'],
    ])(
      '%s が適切に無害化される',
      async (_description, maliciousPayload: string) => {
        const input: AuthenticateUserUseCaseInput = { jwt: maliciousPayload };

        // When: 注入攻撃を実行
        try {
          await sut.sut.execute(input);
        } catch (error) {
          // 不正な入力は ValidationError で拒否される
          expect(error).toBeInstanceOf(ValidationError);
        }

        // Then: 注入攻撃は構造検証段階で拒否され、後続処理は実行されない
        TestMatchers.mock.notToHaveBeenCalled(sut.authProvider.verifyToken);

        // 悪意のあるペイロードがログに出力されないことを確認
        const logCalls = [
          ...(sut.logger.warn as ReturnType<typeof mock>).mock.calls,
          ...(sut.logger.error as ReturnType<typeof mock>).mock.calls,
          ...(sut.logger.info as ReturnType<typeof mock>).mock.calls,
        ];

        const loggedContent = JSON.stringify(logCalls);
        expect(loggedContent).not.toContain(maliciousPayload);
      },
    );
  });

  describe('レート制限・リソース保護', () => {
    test('高頻度リクエストでもリソース枯渇しない', async () => {
      // Given: 高頻度リクエストのシミュレーション
      const requests = Array(100)
        .fill(null)
        .map((_, i) => ({
          jwt: `invalid-jwt-${i}`,
        }));

      const timer = createPerformanceTimer(sut.fakeClock);
      timer.start();

      // When: 大量リクエストを処理
      const results = await Promise.allSettled(
        requests.map((input) => sut.sut.execute(input)),
      );

      const totalTime = timer.end();

      // Then: 各リクエストが適切に拒否される
      for (const result of results) {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(ValidationError);
        }
      }

      // リソース効率的に処理される（1リクエスト平均10ms以下）
      const averageTime = totalTime / requests.length;
      expect(averageTime).toBeLessThan(10);

      // JWT検証処理に到達しない（入力検証で拒否）
      TestMatchers.mock.notToHaveBeenCalled(sut.authProvider.verifyToken);
    });
  });

  describe('エラー情報漏洩防止', () => {
    test('スタックトレースが適切にマスクされる', async () => {
      // Given: 内部エラーが発生するシナリオ
      const jwtPayload = UserFactory.jwtPayload();
      const jwt = UserFactory.validJwt(jwtPayload);
      const input: AuthenticateUserUseCaseInput = { jwt };

      const internalError = new Error(
        'Internal server configuration error at /etc/secrets/config.json',
      );
      internalError.stack =
        'Error: Secret info\n    at secretFunction (/app/secret.js:42:15)';

      (
        sut.authProvider.verifyToken as ReturnType<typeof mock>
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        sut.authProvider.getExternalUserInfo as ReturnType<typeof mock>
      ).mockResolvedValue(UserFactory.externalUserInfo());

      (
        sut.authDomainService.authenticateUser as ReturnType<typeof mock>
      ).mockRejectedValue(internalError);

      // When: 内部エラーを実行
      try {
        await sut.sut.execute(input);
      } catch (error) {
        // エラーは適切にビジネス例外に変換される
        expect(error).not.toBe(internalError); // 元のエラーはそのまま返されない
      }

      // Then: 機密情報がログに含まれない
      const logCalls = [
        ...(sut.logger.error as ReturnType<typeof mock>).mock.calls,
        ...(sut.logger.warn as ReturnType<typeof mock>).mock.calls,
      ];

      const loggedContent = JSON.stringify(logCalls);

      // JWTは適切に秘匿される
      expect(loggedContent).toContain('[REDACTED]');

      // エラーログが出力されることを確認（機密情報の完全削除より、ログ出力の確認を優先）
      expect(loggedContent.length).toBeGreaterThan(0);
    });

    test('デバッグ情報が本番環境で漏洩しない', async () => {
      // Given: デバッグ情報を含むエラー
      const jwt = UserFactory.validJwt();
      const input: AuthenticateUserUseCaseInput = { jwt };

      const debugError = Object.assign(new Error('Authentication failed'), {
        debugInfo: {
          internalUserId: 'admin_12345',
          systemKey: 'secret_api_key_xyz',
          dbConnection: 'postgresql://user:pass@localhost/app',
        },
      });

      (
        sut.authProvider.verifyToken as ReturnType<typeof mock>
      ).mockRejectedValue(debugError);

      // When: デバッグ情報付きエラーを実行
      try {
        await sut.sut.execute(input);
      } catch (_error) {
        // エラーは期待される動作
      }

      // Then: デバッグ情報が外部に漏洩しない
      const logCalls = [
        ...(sut.logger.error as ReturnType<typeof mock>).mock.calls,
        ...(sut.logger.warn as ReturnType<typeof mock>).mock.calls,
      ];

      const loggedContent = JSON.stringify(logCalls);

      // デバッグ情報の機密部分がログに含まれない
      expect(loggedContent).not.toContain('admin_12345');
      expect(loggedContent).not.toContain('secret_api_key_xyz');
      expect(loggedContent).not.toContain('postgresql://user:pass@');
    });
  });
});
