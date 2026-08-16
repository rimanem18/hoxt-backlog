import { createHash, randomBytes } from 'node:crypto';

/**
 * viewerアクセストークン用のトークン生成・ハッシュ化ユーティリティ
 */
export class TokenHasher {
  /**
   * 生トークンを生成する
   * @returns 256bit（32バイト）の16進数文字列
   */
  public generate(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * 生トークンをSHA-256でハッシュ化する
   * @param rawToken - 生トークン
   * @returns SHA-256ハッシュ値（16進数文字列）
   */
  public hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
