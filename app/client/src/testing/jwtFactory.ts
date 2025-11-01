import { SignJWT } from 'jose';

/**
 * モックJWTペイロードの型定義
 *
 * テスト用のJWTトークンに含めるクレームを定義します。
 */
export interface MockJwtPayload {
  /** Subject（ユーザーID等） */
  sub?: string;
  /** メールアドレス */
  email?: string;
  /** 有効期限（Unix時間） */
  exp?: number;
  /** その他のカスタムクレーム */
  [key: string]: unknown;
}

/**
 * テスト用の固定秘密鍵
 *
 * Semgrep誤検出防止: このキーはテスト専用であり、
 * プロダクション環境では使用されません。
 */
const getTestSecret = (): Uint8Array => {
  const secret =
    process.env.JWT_TEST_SECRET || 'test-secret-key-do-not-use-in-production';
  return new TextEncoder().encode(secret);
};

/**
 * テスト用モックJWTトークンを動的生成する
 *
 * joseライブラリを使用して署名付きJWTを生成します。
 * テストコード内で固定JWTトークンをハードコードする代わりに、
 * この関数を使用することでセキュリティリスクを低減します。
 *
 * @param payload - JWTに含めるペイロード（省略時はデフォルト値）
 * @param expiresIn - トークンの有効期限（例: '1h', '2h', '1d'）
 * @returns 生成されたJWTトークン文字列
 *
 * @example
 * ```typescript
 * // デフォルトペイロードで生成
 * const token = await createMockJwt();
 *
 * // カスタムペイロードで生成
 * const customToken = await createMockJwt({
 *   sub: 'user-123',
 *   email: 'test@example.com',
 *   role: 'admin',
 * });
 *
 * // 有効期限を指定
 * const shortLivedToken = await createMockJwt({}, '10m');
 *
 * // 期限切れトークンを生成
 * const expiredToken = await createMockJwt({
 *   sub: 'user-456',
 *   exp: Math.floor(Date.now() / 1000) - 3600, // 1時間前
 * });
 * ```
 */
export async function createMockJwt(
  payload: MockJwtPayload = {},
  expiresIn: string | number = '1h',
): Promise<string> {
  const defaultPayload: MockJwtPayload = {
    sub: 'test-user',
    email: 'test@example.com',
  };

  // デフォルトペイロードとマージ
  const mergedPayload = { ...defaultPayload, ...payload };

  const secret = getTestSecret();

  // SignJWTインスタンスを作成
  const jwt = new SignJWT(mergedPayload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();

  // subjectが存在する場合は設定
  if (mergedPayload.sub) {
    jwt.setSubject(mergedPayload.sub);
  }

  // expが明示的に指定されている場合はそれを使用
  // それ以外はexpiresInパラメータを使用
  if (mergedPayload.exp !== undefined) {
    jwt.setExpirationTime(mergedPayload.exp);
  } else {
    jwt.setExpirationTime(expiresIn);
  }

  return jwt.sign(secret);
}
