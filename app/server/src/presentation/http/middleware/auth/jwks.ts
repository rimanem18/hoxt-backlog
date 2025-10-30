/*
 * JWT検証機能
 * JWKS (JSON Web Key Set) を使用したRS256/ES256署名検証を提供する。
 * 作成日: 2025年09月23日（JWKS専用実装）
 */

import type { JWTPayload } from 'jose';
import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';

/*
 * JWT署名検証（JWKS専用）
 * JWKS (JSON Web Key Set) を使用したRS256/ES256署名検証
 *
 * @param token Bearer認証で送信されたJWTトークン
 * @param authProvider オプショナル: カスタムAuthProvider（テスト時のモック注入）
 * @returns 検証済みのJWTペイロード
 * @throws Error 認証失敗時
 */
export async function verifyJWT(
  token: string,
  authProvider?: IAuthProvider,
): Promise<JWTPayload> {
  try {
    const verifier: IAuthProvider =
      authProvider || AuthDIContainer.getAuthProvider();
    const result = await verifier.verifyToken(token);

    if (result.valid && result.payload) {
      // ドメイン型からjose型への変換
      const josePayload: JWTPayload = {
        sub: result.payload.sub,
        email: result.payload.email,
        aud: result.payload.aud || 'authenticated',
        exp: result.payload.exp,
        iat: result.payload.iat,
        iss: result.payload.iss,
        user_metadata: result.payload.user_metadata,
        app_metadata: result.payload.app_metadata,
      };

      return josePayload;
    } else {
      throw new Error(result.error || 'JWKS verification failed');
    }
  } catch (error) {
    // セキュリティ監査用エラーログ
    console.warn('[AUTH_JWKS] JWT検証失敗:', {
      reason: error instanceof Error ? error.message : 'Unknown error',
      jwtLength: token.length,
    });

    // 統一エラーコードで返却
    throw new Error('AUTHENTICATION_REQUIRED');
  }
}

/*
 * テスト用JWT生成関数
 * 統合テスト実行用の有効なJWTトークンを生成する。
 * 注意: JWKSテストではモック環境を使用してください。
 */
export async function generateTestJWT(payload: {
  userId: string;
  email?: string;
}): Promise<string> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('generateTestJWT is only available in test environment');
  }

  // テスト環境では実際のJWKS検証は困難なため、モック使用を推奨
  console.warn(
    '⚠️ generateTestJWT: 実際のJWKS検証にはモック環境を使用してください',
  );

  // 簡易的なテスト用トークン（実際の検証は期待しない）
  const testToken = `test-jwt-${payload.userId}-${Date.now()}`;
  return testToken;
}
