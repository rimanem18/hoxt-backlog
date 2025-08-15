/**
 * 認証プロバイダー定数
 *
 * システムでサポートする認証プロバイダーの定数定義。
 * 新しいプロバイダー追加時はここに追加する。
 */
export const AuthProviders = {
  /** Google OAuth 2.0 */
  GOOGLE: 'google',
  /** Apple Sign In（将来実装予定） */
  APPLE: 'apple',
  /** Microsoft Azure AD（将来実装予定） */
  MICROSOFT: 'microsoft',
  /** GitHub OAuth（将来実装予定） */
  GITHUB: 'github',
  /** Facebook Login（将来実装予定） */
  FACEBOOK: 'facebook',
  /** LINE Login（将来実装予定） */
  LINE: 'line',
} as const;

/**
 * 認証プロバイダー型
 *
 * システムでサポートする認証プロバイダーの型定義。
 * String Literal Union型により型安全性を確保。
 */
export type AuthProvider = (typeof AuthProviders)[keyof typeof AuthProviders];

/**
 * 認証プロバイダーの検証
 *
 * 指定された文字列が有効な認証プロバイダーかどうかを判定する。
 *
 * @param provider - 検証対象の文字列
 * @returns 有効な認証プロバイダーの場合はtrue
 */
export function isValidAuthProvider(
  provider: string,
): provider is AuthProvider {
  return Object.values(AuthProviders).includes(provider as AuthProvider);
}

/**
 * サポートされている認証プロバイダー一覧を取得
 *
 * @returns 認証プロバイダーの配列
 */
export function getSupportedProviders(): AuthProvider[] {
  return Object.values(AuthProviders);
}
