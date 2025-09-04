import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import type { AuthenticateUserUseCaseInput } from '@/packages/shared-schemas/src/auth';
import type { IJwtValidationService } from '@/shared/services/JwtValidationService';
import { makeSUT } from '../authenticate-user/helpers/makeSUT';

/**
 * 無効JWT検証エラーのテスト
 *
 * 不正な署名や期限切れJWTトークンに対する適切なエラーハンドリングを検証する。
 */
describe('AuthenticateUserUseCase - 無効JWT検証エラーテスト', () => {
  beforeEach(() => {
    // 無効JWTエラーテストの環境初期化
    console.log('無効JWT検証エラーテスト環境の初期化を開始');
  });

  afterEach(() => {
    // エラーテスト後のクリーンアップ
    console.log('無効JWT検証エラーテスト環境のクリーンアップを完了');
  });

  test('無効な署名を持つJWTで認証が失敗する', async () => {
    // Given: 無効な署名を持つJWTトークン
    const invalidSignatureJwtInput: AuthenticateUserUseCaseInput = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi5bGx55Sw5aSq6YOOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2F2YXRhci5qcGciLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiLlsbHnlLDlpKrpg44ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.aW52YWxpZF9zaWduYXR1cmU',
    };

    // 署名検証失敗パターンのモックセットアップ
    const mockAuthProvider: Partial<IAuthProvider> = {
      verifyToken: mock().mockResolvedValue({
        valid: false,
        payload: {},
        error: 'Invalid signature',
      }),
    };

    // When: JWT署名検証を実行
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
    });

    // Then: セキュリティエラーが適切に処理される
    await expect(
      authenticateUserUseCase.execute(invalidSignatureJwtInput),
    ).rejects.toThrow('認証トークンが無効です');

    // エラー詳細検証
    try {
      await authenticateUserUseCase.execute(invalidSignatureJwtInput);
      throw new Error('無効JWTで例外が発生しなかった');
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        name?: string;
        code?: string;
      };
      if (errorObj.message === '無効JWTで例外が発生しなかった') {
        throw error;
      }
      expect(errorObj.name).toBe('AuthenticationError');
      expect(errorObj.code).toBe('INVALID_TOKEN');
      expect(errorObj.message).toBe('認証トークンが無効です');
    }

  });

  test('不正な形式のJWTで認証が失敗する', async () => {
    // Given: 不正な形式のJWTトークンパターン
    const malformedJwtInputs: AuthenticateUserUseCaseInput[] = [
      { jwt: 'invalid.jwt.token.format.broken' }, // 不正なセグメント数
      { jwt: 'not-a-jwt-at-all' }, // JWT形式ではない文字列
      {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.broken_base64_payload.dGVzdF9zaWduYXR1cmU',
      }, // 破損したBase64
    ];

    // JWT形式検証失敗パターンのモックセットアップ
    const mockJwtValidationService: Partial<IJwtValidationService> = {
      validateStructure: mock().mockReturnValue({
        isValid: false,
        failureReason: 'MALFORMED_FORMAT',
        errorMessage: 'JWTの形式が正しくありません',
      }),
    };

    const { sut: authenticateUserUseCase } = makeSUT({
      jwtValidationService: mockJwtValidationService as IJwtValidationService,
    });

    // When: 各種不正形式JWTに対する検証処理を実行
    for (const invalidInput of malformedJwtInputs) {
      // Then: 各種不正形式で統一されたエラーが返される
      await expect(
        authenticateUserUseCase.execute(invalidInput),
      ).rejects.toThrow('JWTの形式が正しくありません');

      try {
        await authenticateUserUseCase.execute(invalidInput);
        throw new Error(
          `不正形式JWT "${invalidInput.jwt}" で例外が発生しなかった`,
        );
      } catch (error: unknown) {
        const errorObj = error as {
          message?: string;
          name?: string;
          code?: string;
        };
        if (
          errorObj.message ===
          `不正形式JWT "${invalidInput.jwt}" で例外が発生しなかった`
        ) {
          throw error;
        }
        expect(errorObj.name).toBe('ValidationError');
        expect(errorObj.code).toBe('VALIDATION_ERROR');
        expect(errorObj.message).toBe('JWTの形式が正しくありません');
      }
    }

  });

  test('期限切れJWTで認証が失敗する', async () => {
    // Given: 期限切れのJWTトークン
    const expiredJwtInput: AuthenticateUserUseCaseInput = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi5bGx55Sw5aSq6YOOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2F2YXRhci5qcGciLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiLlsbHnlLDlpKrpg44ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTIzNDU2fQ.ZXhwaXJlZF9zaWduYXR1cmU',
    };

    // 期限切れ検証失敗パターンのモックセットアップ
    const mockAuthProvider: Partial<IAuthProvider> = {
      verifyToken: mock().mockResolvedValue({
        valid: false,
        payload: {},
        error: 'Token expired',
      }),
    };

    // When: JWT期限チェックを実行
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
    });

    // Then: 期限切れエラーが適切に処理される
    await expect(
      authenticateUserUseCase.execute(expiredJwtInput),
    ).rejects.toThrow('認証トークンが無効です');

    try {
      await authenticateUserUseCase.execute(expiredJwtInput);
      throw new Error('期限切れJWTで例外が発生しなかった');
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        name?: string;
        code?: string;
      };
      if (errorObj.message === '期限切れJWTで例外が発生しなかった') {
        throw error; // テスト失敗として再スロー
      }

      expect(errorObj.name).toBe('AuthenticationError');
      expect(errorObj.code).toBe('INVALID_TOKEN');
      expect(errorObj.message).toBe('認証トークンが無効です');
    }

  });

  test('空文字列JWTで入力検証エラーが発生する', async () => {
    // Given: 空文字列のJWT入力
    const emptyJwtInput: AuthenticateUserUseCaseInput = {
      jwt: '',
    };

    const { sut: authenticateUserUseCase } = makeSUT();

    // When & Then: 入力検証エラーが発生する
    await expect(
      authenticateUserUseCase.execute(emptyJwtInput),
    ).rejects.toThrow('JWTトークンが必要です');
  });
});
