import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type {
  ExternalUserInfo,
  IAuthProvider,
  JwtPayload,
  JwtVerificationResult,
} from '@/user/domain/services/IAuthProvider';
import {
  issueTestAccessToken,
  TestBypassAuthProvider,
} from '../TestBypassAuthProvider';

function createDelegateSpy(
  result: JwtVerificationResult,
): IAuthProvider & { verifyTokenCalls: string[] } {
  const verifyTokenCalls: string[] = [];
  return {
    verifyTokenCalls,
    async verifyToken(token: string) {
      verifyTokenCalls.push(token);
      return result;
    },
    async getExternalUserInfo(): Promise<ExternalUserInfo> {
      throw new Error('not used in this test');
    },
  };
}

describe('TestBypassAuthProvider', () => {
  const originalEnvironment = process.env.ENVIRONMENT;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnableFlag = process.env.ENABLE_TEST_ENDPOINTS;

  beforeEach(() => {
    process.env.ENVIRONMENT = 'development';
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_ENDPOINTS = 'true';
  });

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.ENVIRONMENT;
    } else {
      process.env.ENVIRONMENT = originalEnvironment;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalEnableFlag === undefined) {
      delete process.env.ENABLE_TEST_ENDPOINTS;
    } else {
      process.env.ENABLE_TEST_ENDPOINTS = originalEnableFlag;
    }
  });

  test('テスト専用ガードが有効な場合、テストトークンを署名検証なしで解釈する', async () => {
    // Given: テスト専用ガードが有効な状態で発行されたテストトークン
    const delegate = createDelegateSpy({ valid: false, error: 'unused' });
    const provider = new TestBypassAuthProvider(delegate);
    const token = issueTestAccessToken({
      sub: 'ext-123',
      email: 'viewer@example.com',
      provider: 'email',
    });

    // When: トークンを検証する
    const result = await provider.verifyToken(token);

    // Then: 委譲先を呼ばずにペイロードを直接組み立てて返す
    expect(result.valid).toBe(true);
    expect(result.payload?.sub).toBe('ext-123');
    expect(result.payload?.email).toBe('viewer@example.com');
    expect(result.payload?.app_metadata.provider).toBe('email');
    expect(delegate.verifyTokenCalls).toHaveLength(0);
  });

  test('テスト専用ガードが無効な場合、テストトークン形式でも実プロバイダーへ委譲する', async () => {
    // Given: ENABLE_TEST_ENDPOINTSが無効な状態
    process.env.ENABLE_TEST_ENDPOINTS = 'false';
    const delegatedResult: JwtVerificationResult = {
      valid: false,
      error: 'delegated',
    };
    const delegate = createDelegateSpy(delegatedResult);
    const provider = new TestBypassAuthProvider(delegate);
    const token = issueTestAccessToken({
      sub: 'ext-123',
      email: 'viewer@example.com',
      provider: 'email',
    });

    // When: トークンを検証する
    const result = await provider.verifyToken(token);

    // Then: 実プロバイダーへ委譲される（fail-closed）
    expect(result).toEqual(delegatedResult);
    expect(delegate.verifyTokenCalls).toEqual([token]);
  });

  test('テスト専用トークン形式でないトークンは常に実プロバイダーへ委譲する', async () => {
    // Given: テスト専用ガードは有効だが、通常のJWT形式のトークン
    const delegatedResult: JwtVerificationResult = {
      valid: true,
      payload: {
        sub: 'real-sub',
        email: 'real@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: { name: 'Real User' },
        iss: 'https://real.supabase.co',
        iat: 0,
        exp: 0,
      } as JwtPayload,
    };
    const delegate = createDelegateSpy(delegatedResult);
    const provider = new TestBypassAuthProvider(delegate);

    // When: 実プロバイダー向けのトークンを検証する
    const result = await provider.verifyToken('real.jwt.token');

    // Then: 実プロバイダーへ委譲される
    expect(result).toEqual(delegatedResult);
    expect(delegate.verifyTokenCalls).toEqual(['real.jwt.token']);
  });

  test('3パート形式だがpayloadがマーカーを含まないトークンは実プロバイダーへ委譲する', async () => {
    // Given: JWTと同じ3パート構造だが、E2E専用マーカーを持たないpayload
    const delegatedResult: JwtVerificationResult = {
      valid: false,
      error: 'delegated',
    };
    const delegate = createDelegateSpy(delegatedResult);
    const provider = new TestBypassAuthProvider(delegate);
    const bogusPayload = Buffer.from(JSON.stringify({ sub: 'x' })).toString(
      'base64url',
    );
    const token = `header.${bogusPayload}.sig`;

    // When: マーカーのないトークンを検証する
    const result = await provider.verifyToken(token);

    // Then: 実プロバイダーへ委譲される
    expect(result).toEqual(delegatedResult);
    expect(delegate.verifyTokenCalls).toEqual([token]);
  });

  test('getExternalUserInfoは常に実プロバイダーへ委譲する', async () => {
    // Given: 委譲先のgetExternalUserInfoが特定の値を返す設定
    const expected: ExternalUserInfo = {
      id: 'ext-1',
      provider: 'google',
      email: 'a@example.com',
      name: 'A',
    };
    const delegate: IAuthProvider = {
      async verifyToken() {
        throw new Error('not used in this test');
      },
      async getExternalUserInfo() {
        return expected;
      },
    };
    const provider = new TestBypassAuthProvider(delegate);

    // When: getExternalUserInfoを呼び出す
    const result = await provider.getExternalUserInfo({} as JwtPayload);

    // Then: 委譲先の戻り値がそのまま返る
    expect(result).toEqual(expected);
  });
});
