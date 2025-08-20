/**
 * テストユーザー生成ファクトリ
 *
 * 各種テストシナリオに対応したユーザーデータを生成。
 * プリセットパターンによる一貫したテストデータ作成を支援。
 */

import type {
  ExternalUserInfo,
  JwtPayload,
} from '@/domain/services/IAuthProvider';
import type { AuthProvider } from '@/domain/user/AuthProvider';
import type { User } from '@/domain/user/UserEntity';

/**
 * ベースユーザープロパティ
 */
interface BaseUserProperties {
  readonly id?: string;
  readonly externalId?: string;
  readonly provider?: AuthProvider;
  readonly email?: string;
  readonly name?: string;
  readonly avatarUrl?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly lastLoginAt?: Date;
}

/**
 * 既存ユーザーの作成
 *
 * @param overrides 上書きしたいプロパティ
 * @returns 既存ユーザーエンティティ
 */
export function createExistingUser(
  overrides: Partial<BaseUserProperties> = {},
): User {
  const now = new Date('2025-08-20T10:00:00Z');
  const createdAt = new Date('2025-08-01T10:00:00Z');

  return {
    id: 'uuid-existing-user',
    externalId: 'google_existing_12345',
    provider: 'google',
    email: 'existing@example.com',
    name: '既存ユーザー',
    avatarUrl: 'https://lh3.googleusercontent.com/existing-avatar.jpg',
    createdAt,
    updatedAt: now,
    lastLoginAt: now,
    ...overrides,
  };
}

/**
 * 新規ユーザーの作成
 *
 * @param overrides 上書きしたいプロパティ
 * @returns 新規ユーザーエンティティ
 */
export function createNewUser(
  overrides: Partial<BaseUserProperties> = {},
): User {
  const now = new Date();

  return {
    id: 'uuid-new-user',
    externalId: 'google_new_67890',
    provider: 'google',
    email: 'newuser@example.com',
    name: '新規ユーザー',
    avatarUrl: 'https://lh3.googleusercontent.com/new-avatar.jpg',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    ...overrides,
  };
}

/**
 * 有効なJWTペイロードの作成
 *
 * @param externalId 外部ID（デフォルト値あり）
 * @param email メールアドレス（デフォルト値あり）
 * @param name ユーザー名（デフォルト値あり）
 * @param provider プロバイダー（デフォルト値あり）
 * @returns 有効なJWTペイロード
 */
export function createValidJwtPayload(
  externalId = 'google_12345',
  email = 'user@example.com',
  name = 'テストユーザー',
  provider: AuthProvider = 'google',
): JwtPayload {
  const now = Math.floor(Date.now() / 1000);

  return {
    sub: externalId,
    email,
    app_metadata: {
      provider,
      providers: [provider],
    },
    user_metadata: {
      name,
      email,
      full_name: name,
      avatar_url: `https://lh3.googleusercontent.com/${externalId}-avatar.jpg`,
    },
    iss: 'https://supabase.co',
    iat: now,
    exp: now + 3600,
  };
}

/**
 * 外部ユーザー情報の作成
 *
 * @param externalId 外部ID（デフォルト値あり）
 * @param email メールアドレス（デフォルト値あり）
 * @param name ユーザー名（デフォルト値あり）
 * @param provider プロバイダー（デフォルト値あり）
 * @returns 外部ユーザー情報
 */
export function createExternalUserInfo(
  externalId = 'google_12345',
  email = 'user@example.com',
  name = 'テストユーザー',
  provider: AuthProvider = 'google',
): ExternalUserInfo {
  return {
    id: externalId,
    provider,
    email,
    name,
    avatarUrl: `https://lh3.googleusercontent.com/${externalId}-avatar.jpg`,
  };
}

/**
 * 有効なJWTトークン（ダミー）の作成
 *
 * @param payload JWTペイロード
 * @returns JWTトークン文字列
 */
export function createValidJwt(payload?: Partial<JwtPayload>): string {
  const defaultPayload = createValidJwtPayload();
  const mergedPayload = { ...defaultPayload, ...payload };

  // 実際のJWT形式（Base64URLエンコードを使用）
  const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const encodedPayload = Buffer.from(JSON.stringify(mergedPayload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Base64URLエンコーディング（パディング削除）
  const signature = 'test-signature';

  return `${header}.${encodedPayload}.${signature}`;
}

/**
 * 無効なJWTトークンのパターン生成
 */
export const INVALID_JWT_PATTERNS = {
  // 構造が不正
  malformed: 'invalid.jwt',
  empty: '',
  null: null as string | null,
  undefined: undefined as string | undefined,

  // 署名が無効
  invalidSignature:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpbnZhbGlkIn0.invalid-signature',

  // 期限切れ
  expired: createValidJwt({ exp: Math.floor(Date.now() / 1000) - 3600 }),

  // 長すぎるJWT (2KB超)
  tooLong: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${'a'.repeat(2100)}.signature`,
} as const;

/**
 * テスト用ユーザーファクトリの便利メソッド集
 */
export const UserFactory = {
  existing: createExistingUser,
  new: createNewUser,
  jwtPayload: createValidJwtPayload,
  externalUserInfo: createExternalUserInfo,
  validJwt: createValidJwt,
  invalidJwt: INVALID_JWT_PATTERNS,
} as const;
