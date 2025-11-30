/**
 * 認証ミドルウェアで使用するカスタムエラークラス
 *
 * エラー分類を型安全にし、401/500の判定を確実にする
 */

/**
 * データベース接続エラー
 *
 * RLS設定時のDB接続失敗、トランザクション開始失敗など
 */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * RLS設定エラー
 *
 * SET LOCAL実行失敗、UUID検証失敗など
 */
export class RlsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RlsConfigError';
  }
}

/**
 * JWT検証エラー
 *
 * 署名検証失敗、有効期限切れ、payloadなしなど
 */
export class JwtVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtVerificationError';
  }
}
