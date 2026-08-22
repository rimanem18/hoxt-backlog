import { isTestEndpointsEnabled } from '@/shared/config/env';
import type {
  ExternalUserInfo,
  IAuthProvider,
  JwtPayload,
  JwtVerificationResult,
} from '@/user/domain/services/IAuthProvider';

/**
 * E2E専用トークンの目印。クライアント側（authValidation.ts）が
 * `access_token.split('.').length === 3`でJWT形式を要求するため、
 * 本物のJWTと同じ3パート構造にしたうえでpayload内にこのマーカーを埋め込む。
 */
const E2E_TEST_TOKEN_MARKER = 'e2eTestToken';
const TEST_TOKEN_HEADER = Buffer.from(
  JSON.stringify({ alg: 'none', typ: E2E_TEST_TOKEN_MARKER }),
).toString('base64url');
const TEST_TOKEN_SIGNATURE = 'e2e-test-signature';

export interface TestTokenClaims {
  sub: string;
  email: string;
  provider: string;
}

interface TestTokenPayload extends TestTokenClaims {
  marker: typeof E2E_TEST_TOKEN_MARKER;
}

/**
 * E2E専用の疑似アクセストークンを発行する
 * 実際のJWT署名は持たず、TestBypassAuthProviderのみが解釈できる
 */
export function issueTestAccessToken(claims: TestTokenClaims): string {
  const payload: TestTokenPayload = {
    ...claims,
    marker: E2E_TEST_TOKEN_MARKER,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  return `${TEST_TOKEN_HEADER}.${encodedPayload}.${TEST_TOKEN_SIGNATURE}`;
}

/**
 * TestBypassAuthProvider
 *
 * E2Eテストが実バックエンドへ認証済みリクエストを送るための委譲プロバイダー。
 * isTestEndpointsEnabled()がtrueかつpayload内にE2E専用マーカーを持つ場合のみ
 * 署名検証をスキップする。それ以外のトークンは実プロバイダーへ委譲するため、
 * 本番環境はもちろんテスト専用エンドポイントが無効な環境でもバイパスは機能しない。
 */
export class TestBypassAuthProvider implements IAuthProvider {
  constructor(private readonly delegate: IAuthProvider) {}

  async verifyToken(token: string): Promise<JwtVerificationResult> {
    const testTokenPayload = TestBypassAuthProvider.decodeTestToken(token);

    if (isTestEndpointsEnabled() && testTokenPayload) {
      return TestBypassAuthProvider.toVerificationResult(testTokenPayload);
    }

    return this.delegate.verifyToken(token);
  }

  async getExternalUserInfo(payload: JwtPayload): Promise<ExternalUserInfo> {
    return this.delegate.getExternalUserInfo(payload);
  }

  private static decodeTestToken(token: string): TestTokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(parts[1] ?? '', 'base64url').toString('utf-8'),
      ) as Partial<TestTokenPayload>;

      if (decoded.marker !== E2E_TEST_TOKEN_MARKER) {
        return null;
      }

      return decoded as TestTokenPayload;
    } catch {
      return null;
    }
  }

  private static toVerificationResult(
    claims: TestTokenPayload,
  ): JwtVerificationResult {
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: claims.sub,
      email: claims.email,
      aud: 'authenticated',
      app_metadata: {
        provider: claims.provider,
        providers: [claims.provider],
      },
      user_metadata: { name: claims.email },
      iss: 'e2e-test',
      iat: now,
      exp: now + 3600,
    };

    return { valid: true, payload };
  }
}
