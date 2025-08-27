/*
 * JWT検証機能
 * Supabase JWT Secretを使用したHMAC-SHA256署名検証を提供する。
 */

import { jwtVerify, type JWTPayload } from 'jose';

// Supabase JWT Secret設定
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret-key';

// テスト環境では環境変数チェックを緩和
if (!process.env.SUPABASE_JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  SUPABASE_JWT_SECRET環境変数が設定されていません。テスト用モック値を使用します。');
}

/*
 * JWT署名検証
 * @param token Bearer認証で送信されたJWTトークン
 * @returns 検証済みのJWTペイロード
 * @throws Error 認証失敗時
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    // JWT Secretをバイト配列に変換
    const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);

    // JWT署名検証実行（HMAC-SHA256）
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'], // HMAC-SHA256のみ許可
      clockTolerance: 30     // 30秒のクロックスキュー許容
    });

    // 必須フィールドの存在確認
    if (!payload.sub) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }

    return payload;
  } catch (error) {
    // 統一エラーコードに変換
    if (error instanceof Error) {
      // セキュリティ監査用エラーログ
      console.warn('[AUTH] JWT検証失敗:', {
        reason: error.message.includes('signature') ? 'INVALID_SIGNATURE' : 
                error.message.includes('expired') ? 'TOKEN_EXPIRED' :
                error.message.includes('sub') ? 'MISSING_USER_ID' : 'INVALID_FORMAT',
        jwtLength: token.length,
        errorMessage: error.message
      });
    }
    
    // 統一エラーコードで返却
    throw new Error('AUTHENTICATION_REQUIRED');
  }
}

/*
 * テスト用JWT生成関数
 * 統合テスト実行用の有効なJWTトークンを生成する。
 */
export async function generateTestJWT(payload: { userId: string; email?: string }): Promise<string> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('generateTestJWT is only available in test environment');
  }

  // テスト環境でも実際のHS256署名を使用
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);

  const jwt = await new SignJWT({ 
    sub: payload.userId,
    email: payload.email || 'test@example.com',
    aud: 'authenticated'
  })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(secret);

  return jwt;
}