/**
 * 【機能概要】: JWT検証（設計仕様準拠: Supabase JWT Secret方式）
 * 【実装方針】: 環境変数のJWT_SECRETを使用したHMAC-SHA256署名検証
 * 【テスト対応】: テスト時のモック認証を可能にする構造で実装
 * 🟢 信頼性レベル: architecture.md設計仕様「JWT検証（Supabase JWT Secret）」準拠
 */

import { jwtVerify, type JWTPayload } from 'jose';

// 【環境変数】: Supabase JWT Secret設定（設計仕様準拠）
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret-key';

// 【テスト環境対応】: NODE_ENV=test時は環境変数チェックを緩和
if (!process.env.SUPABASE_JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  SUPABASE_JWT_SECRET環境変数が設定されていません。テスト用モック値を使用します。');
}

/**
 * 【JWT検証】: Supabase JWT Secretによる署名検証（設計仕様準拠）
 * @param token Bearer認証で送信されたJWTトークン
 * @returns 検証済みのJWTペイロード（userId等を含む）
 * @throws AuthError 認証関連エラー（統一エラーコード使用）
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    // 【JWT Secret準備】: 環境変数から取得したSecretをバイト配列に変換
    const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);

    // 【JWT検証実行】: HMAC-SHA256署名検証
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'], // 【署名アルゴリズム】: HMAC-SHA256のみ許可
      clockTolerance: 30     // 【時刻誤差許容】: 30秒のクロックスキュー許容
    });

    // 【ペイロード検証】: 必須フィールドの存在確認
    if (!payload.sub) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }

    return payload;
  } catch (error) {
    // 【統一エラーコード】: 設計仕様準拠のAUTHENTICATION_REQUIREDに統一
    if (error instanceof Error) {
      // 【ログ記録】: セキュリティ監査用のエラーログ
      console.warn('[AUTH] JWT検証失敗:', {
        reason: error.message.includes('signature') ? 'INVALID_SIGNATURE' : 
                error.message.includes('expired') ? 'TOKEN_EXPIRED' :
                error.message.includes('sub') ? 'MISSING_USER_ID' : 'INVALID_FORMAT',
        jwtLength: token.length,
        errorMessage: error.message
      });
    }
    
    // 【統一エラー】: api-endpoints.md仕様準拠のエラーコード
    throw new Error('AUTHENTICATION_REQUIRED');
  }
}

/**
 * 【テスト用JWT生成】: テスト時の有効なJWTトークン生成
 * プロダクションでは使用しないが、統合テスト実行で利用
 */
export async function generateTestJWT(payload: { userId: string; email?: string }): Promise<string> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('generateTestJWT is only available in test environment');
  }

  // 【実際のJWT署名】: テスト環境でも実際のHS256署名を使用
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