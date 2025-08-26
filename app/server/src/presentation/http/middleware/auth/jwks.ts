/**
 * 【機能概要】: JWT検証用のJWKS（JSON Web Key Set）管理
 * 【実装方針】: Supabase JWKS エンドポイントからの公開鍵取得・キャッシュ
 * 【テスト対応】: JWKS取得をモック可能な構造で実装
 * 🟡 信頼性レベル: Supabaseドキュメントとjoseライブラリ仕様から推測
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

// 【環境変数】: Supabaseプロジェクト設定
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock-project.supabase.co';
const SUPABASE_PROJECT_ID = SUPABASE_URL.split('//')[1]?.split('.')[0] || 'mock-project';

// 【テスト環境対応】: NODE_ENV=test時は環境変数チェックを緩和
if (!process.env.SUPABASE_URL && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  SUPABASE_URL環境変数が設定されていません。モック値を使用します。');
}

/**
 * 【JWKS設定】: Supabase認証サービスからの公開鍵取得
 * - cooldownDuration: 1時間キャッシュでパフォーマンス向上
 * - Supabase標準のJWKSエンドポイントを使用
 */
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/keys`),
  { 
    cooldownDuration: 60 * 60 * 1000, // 【キャッシュ時間】: 1時間（3600秒）
    timeoutDuration: 5000              // 【タイムアウト】: 5秒でフェイルファスト
  }
);

/**
 * 【JWT検証】: Supabase発行のJWTトークンを検証し、ペイロードを返却
 * @param token Bearer認証で送信されたJWTトークン
 * @returns 検証済みのJWTペイロード（userId等を含む）
 * @throws JWSSignatureVerificationFailed 署名検証失敗
 * @throws JWTExpired トークン期限切れ
 * @throws JWTInvalid その他の検証エラー
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    // 【JWT検証実行】: 発行者・受信者・署名を包括的に検証
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${SUPABASE_URL}/auth/v1`,     // 【発行者検証】: Supabase認証サービス
      audience: 'authenticated',              // 【受信者検証】: 認証済みユーザー向け
      clockTolerance: 30                      // 【時刻誤差許容】: 30秒のクロックスキュー許容
    });

    // 【ペイロード検証】: 必須フィールドの存在確認
    if (!payload.sub) {
      throw new Error('JWTにuser IDが含まれていません');
    }

    return payload;
  } catch (error) {
    // 【エラー詳細化】: jose固有のエラーを分かりやすいメッセージに変換
    if (error instanceof Error) {
      // 【エラー種別判定】: エラータイプに応じた適切な例外生成
      if (error.message.includes('signature')) {
        throw new Error('TOKEN_INVALID: JWT署名が無効です');
      }
      if (error.message.includes('expired')) {
        throw new Error('TOKEN_EXPIRED: JWTの有効期限が切れています');
      }
      if (error.message.includes('issuer')) {
        throw new Error('TOKEN_INVALID: JWT発行者が不正です');
      }
      
      // 【予期外エラー】: その他の検証エラー
      throw new Error(`TOKEN_INVALID: ${error.message}`);
    }
    
    // 【最終フォールバック】: 未知のエラータイプ
    throw new Error('TOKEN_INVALID: JWT検証で予期しないエラーが発生しました');
  }
}

/**
 * 【テスト用エクスポート】: JWKSインスタンスのテスト時モック対応
 * プロダクションでは使用しないが、テスト時のモック注入で利用
 */
export { JWKS };