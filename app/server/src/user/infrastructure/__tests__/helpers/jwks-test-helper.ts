/*
 * JWKSテスト用ヘルパー
 * RSA鍵ペア生成、JWKS作成、トークン署名機能を提供する。
 */

import { exportJWK, generateKeyPair, SignJWT } from 'jose';

/**
 * テスト用RSA鍵ペアとJWKS
 */
export interface TestJwksContext {
  privateKey: CryptoKey;
  jwksJson: string;
}

/**
 * テスト用RSA鍵ペアとJWKSを生成する
 *
 * @returns RSA鍵ペアとJWKS JSON
 */
export async function generateTestJwks(): Promise<TestJwksContext> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');

  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'test-key-id';
  publicJwk.use = 'sig';
  publicJwk.alg = 'RS256';

  const jwks = {
    keys: [publicJwk],
  };

  return {
    privateKey,
    jwksJson: JSON.stringify(jwks),
  };
}

/**
 * テスト用JWTトークンを署名する
 *
 * @param privateKey - 署名に使用する秘密鍵
 * @param payload - JWTペイロード
 * @param options - トークンオプション（issuer, audience, expirationなど）
 * @returns 署名済みJWTトークン
 */
export async function signTestToken(
  privateKey: CryptoKey,
  payload: Record<string, unknown>,
  options: {
    issuer?: string;
    audience?: string;
    expirationTime?: string | number;
    notBefore?: string | number;
  } = {},
): Promise<string> {
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
    .setIssuedAt();

  if (options.issuer) {
    jwt.setIssuer(options.issuer);
  }

  if (options.audience) {
    jwt.setAudience(options.audience);
  }

  if (options.expirationTime) {
    jwt.setExpirationTime(options.expirationTime);
  }

  if (options.notBefore) {
    jwt.setNotBefore(options.notBefore);
  }

  return jwt.sign(privateKey);
}

/**
 * global.fetchをモックしてJWKSエンドポイントをシミュレートする
 *
 * @param jwksJson - 返却するJWKS JSON文字列
 * @returns モック解除関数
 */
export function mockJwksFetch(jwksJson: string): () => void {
  const originalFetch = global.fetch;

  const mockFn = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    // Request オブジェクトの url プロパティから URL を取得
    const url =
      typeof input === 'string'
        ? input
        : 'url' in input
          ? input.url
          : input.toString();

    if (url.includes('/.well-known/jwks.json')) {
      return new Response(jwksJson, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input as RequestInfo, init);
  };

  global.fetch = mockFn as typeof fetch;

  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * JWKS取得失敗をシミュレートする
 *
 * @param errorMessage - エラーメッセージ
 * @returns モック解除関数
 */
export function mockJwksFetchFailure(
  errorMessage = 'Network error',
): () => void {
  const originalFetch = global.fetch;

  const mockFn = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    // Request オブジェクトの url プロパティから URL を取得
    const url =
      typeof input === 'string'
        ? input
        : 'url' in input
          ? input.url
          : input.toString();

    if (url.includes('/.well-known/jwks.json')) {
      throw new Error(errorMessage);
    }

    return originalFetch(input as RequestInfo, init);
  };

  global.fetch = mockFn as typeof fetch;

  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * JWKS取得が指定回数失敗した後に成功するリトライシミュレーション
 *
 * @param failureCount - 失敗させる回数
 * @param jwksJson - 最終的に返却するJWKS JSON文字列
 * @returns モック解除関数と呼び出し回数カウンター
 */
export function mockJwksFetchWithRetry(
  failureCount: number,
  jwksJson: string,
): { unmock: () => void; getCallCount: () => number } {
  const originalFetch = global.fetch;
  let callCount = 0;

  const mockFn = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : 'url' in input
          ? input.url
          : input.toString();

    if (url.includes('/.well-known/jwks.json')) {
      callCount++;

      // 指定回数まで失敗
      if (callCount <= failureCount) {
        throw new Error('Temporary network error');
      }

      // 指定回数を超えたら成功
      return new Response(jwksJson, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input as RequestInfo, init);
  };

  global.fetch = mockFn as typeof fetch;

  return {
    unmock: () => {
      global.fetch = originalFetch;
    },
    getCallCount: () => callCount,
  };
}

/**
 * JWKS取得にタイムアウトをシミュレートする
 *
 * @param delayMs - 遅延時間（ミリ秒）
 * @returns モック解除関数
 */
export function mockJwksFetchWithTimeout(delayMs: number): () => void {
  const originalFetch = global.fetch;

  const mockFn = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : 'url' in input
          ? input.url
          : input.toString();

    if (url.includes('/.well-known/jwks.json')) {
      // 指定時間待機
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // AbortSignalがabortされているかチェック
      if (init?.signal?.aborted) {
        throw new Error('The operation was aborted');
      }

      throw new Error('Request timeout');
    }

    return originalFetch(input as RequestInfo, init);
  };

  global.fetch = mockFn as typeof fetch;

  return () => {
    global.fetch = originalFetch;
  };
}
