/**
 * authValidation.ts のテスト
 * getSupabaseStorageKey 関数の動的キー生成ロジックを検証
 */

import { afterEach, describe, expect, it } from 'bun:test';
import type { User } from '@/packages/shared-schemas/src/auth';
import {
  clearStoredAuth,
  getSupabaseStorageKey,
  persistVerifiedUserDisplay,
  VERIFIED_USER_DISPLAY_STORAGE_KEY,
  validateStoredAuth,
} from '../authValidation';

function storeSupabaseSession(overrides: {
  userMetadata?: Record<string, unknown>;
  userOverrides?: Record<string, unknown>;
}): void {
  const accessToken = 'header.payload.signature';
  const futureExpiresAt = Math.floor(Date.now() / 1000) + 3600;

  localStorage.setItem(
    getSupabaseStorageKey(),
    JSON.stringify({
      access_token: accessToken,
      expires_at: futureExpiresAt,
      user: {
        id: 'user-id-1',
        email: 'sample-user@example.test',
        user_metadata: overrides.userMetadata,
        ...overrides.userOverrides,
      },
    }),
  );
}

// externalId はSupabase Authのuser.id（storeSupabaseSessionの'user-id-1'）と
// 同一値。idはアプリ内部DBの主キーであり、Supabaseのuser.idとは別値のため
// あえて異なる値にしている（実運用の形状を反映するため）
function buildVerifiedUser(overrides: Partial<User> = {}): User {
  return {
    id: 'internal-db-id-1',
    externalId: 'user-id-1',
    provider: 'email',
    email: 'sample-user@example.test',
    name: 'デモユーザー',
    avatarUrl: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    lastLoginAt: null,
    ...overrides,
  };
}

/**
 * getSupabaseStorageKey 関数のテスト
 * 環境に応じたSupabaseストレージキーの動的生成を検証
 */
describe('getSupabaseStorageKey', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    // テスト後に環境変数を復元
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
    }
  });

  it('環境変数未設定時はlocalhostキーを返す', () => {
    // Given: 環境変数が未設定
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: localhost用のキーが返される
    expect(result).toBe('sb-localhost-auth-token');
  });

  it('.supabase.co ドメインからプロジェクトIDを抽出する', () => {
    // Given: .supabase.co ドメインのURL
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://example-project-ref.supabase.co';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: プロジェクトIDを含むキーが返される
    expect(result).toBe('sb-example-project-ref-auth-token');
  });

  it('.supabase.net ドメインからプロジェクトIDを抽出する', () => {
    // Given: .supabase.net ドメインのURL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.net';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: プロジェクトIDを含むキーが返される
    expect(result).toBe('sb-myproject-auth-token');
  });

  it('カスタムドメインからプロジェクトIDを抽出する', () => {
    // Given: カスタムドメインのURL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.example.com';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: サブドメインを含むキーが返される
    expect(result).toBe('sb-custom-auth-token');
  });

  it('空文字列の環境変数に対してlocalhost キーを返す', () => {
    // Given: 空文字列の環境変数
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: localhost用のキーが返される
    expect(result).toBe('sb-localhost-auth-token');
  });

  it('https以外のプロトコルに対してlocalhost キーを返す', () => {
    // Given: http プロトコルのURL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://insecure.supabase.co';

    // When: getSupabaseStorageKey を呼び出す
    const result = getSupabaseStorageKey();

    // Then: localhost用のキーが返される（セキュリティ考慮）
    expect(result).toBe('sb-localhost-auth-token');
  });
});

/**
 * validateStoredAuth 関数のテスト
 * リロード時にlocalStorageのSupabaseセッションからnameとavatarUrlを
 * 正しく復元できるかを検証（ダッシュボードリロード時のバグ回帰防止）
 */
describe('validateStoredAuth', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('user_metadata.full_nameのみの場合、nameがfull_nameから復元される', () => {
    // Given: Googleログイン相当（トップレベルnameなし、full_nameのみ）
    storeSupabaseSession({
      userMetadata: { full_name: '山田太郎' },
    });

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: nameがfull_nameから復元される
    expect(result.isValid).toBe(true);
    expect(result.data?.user.name).toBe('山田太郎');
  });

  it('user_metadata.nameがfull_nameより優先される', () => {
    // Given: nameとfull_nameが両方存在する
    storeSupabaseSession({
      userMetadata: { name: '優先される名前', full_name: '無視される名前' },
    });

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: nameが優先して復元される
    expect(result.data?.user.name).toBe('優先される名前');
  });

  it('user_metadataに名前情報がない場合、nameがemailにフォールバックする', () => {
    // Given: Email/Password(Demo User)相当、user_metadataに名前情報なし
    storeSupabaseSession({
      userMetadata: {},
    });

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: nameがemailにフォールバックする
    expect(result.data?.user.name).toBe('sample-user@example.test');
  });

  it('user_metadataが存在しない場合でも例外を投げずnameがemailにフォールバックする', () => {
    // Given: user_metadata自体がundefined
    storeSupabaseSession({
      userMetadata: undefined,
    });

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: 例外にならずemailへフォールバックする
    expect(result.isValid).toBe(true);
    expect(result.data?.user.name).toBe('sample-user@example.test');
  });

  it('avatar_urlがpictureより優先してavatarUrlに復元される', () => {
    // Given: avatar_urlとpictureが両方存在する
    storeSupabaseSession({
      userMetadata: {
        avatar_url: 'https://example.com/avatar.png',
        picture: 'https://example.com/picture.png',
      },
    });

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: avatar_urlが優先して復元される
    expect(result.data?.user.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('avatar情報が一切ない場合、avatarUrlがnullになる', () => {
    // Given: avatar_url, pictureともに存在しない
    storeSupabaseSession({
      userMetadata: {},
    });

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: avatarUrlがnullになる
    expect(result.data?.user.avatarUrl).toBeNull();
  });

  it('user_metadata以外の既存フィールドはそのまま維持される', () => {
    // Given: idやemailを含むuserオブジェクト
    storeSupabaseSession({
      userMetadata: { full_name: '山田太郎' },
    });

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: idとemailがそのまま維持される
    expect(result.data?.user.id).toBe('user-id-1');
    expect(result.data?.user.email).toBe('sample-user@example.test');
  });

  it('バックエンド検証済みキャッシュが存在する場合、nameはキャッシュの値が優先されメールにフォールバックしない', () => {
    // Given: user_metadataに名前情報がなくメールにフォールバックする状況で、
    // 同一externalId（Supabaseセッションのuser.idと同じ値）の
    // バックエンド検証済みキャッシュ（例: デモユーザー）が存在する
    storeSupabaseSession({
      userMetadata: {},
    });
    persistVerifiedUserDisplay(buildVerifiedUser({ name: 'デモユーザー' }));

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: nameはキャッシュの値になり、メールにフォールバックしない
    expect(result.data?.user.name).toBe('デモユーザー');
  });

  it('バックエンド検証済みキャッシュのavatarUrlが優先される', () => {
    // Given: user_metadataのavatar_urlとは異なるキャッシュ済みavatarUrlが存在する
    storeSupabaseSession({
      userMetadata: { avatar_url: 'https://example.com/metadata.png' },
    });
    persistVerifiedUserDisplay(
      buildVerifiedUser({ avatarUrl: 'https://example.com/cached.png' }),
    );

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: avatarUrlはキャッシュの値になる
    expect(result.data?.user.avatarUrl).toBe('https://example.com/cached.png');
  });

  it('キャッシュのexternalIdが現在のSupabaseセッションのuser.idと一致しない場合は無視される', () => {
    // Given: 別ユーザーexternalId宛のキャッシュが残っている状況
    storeSupabaseSession({
      userMetadata: {},
    });
    persistVerifiedUserDisplay(
      buildVerifiedUser({ externalId: 'other-user-id', name: '別ユーザー' }),
    );

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: キャッシュは使われず、既存のフォールバック（email）が使われる
    expect(result.data?.user.name).toBe('sample-user@example.test');
  });

  it('キャッシュのJSONが不正な場合でも例外を投げず既存のフォールバックが使われる', () => {
    // Given: キャッシュキーに不正なJSON文字列が入っている
    storeSupabaseSession({
      userMetadata: {},
    });
    localStorage.setItem(VERIFIED_USER_DISPLAY_STORAGE_KEY, 'not-json');

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: 例外にならず既存のフォールバック（email）が使われる
    expect(result.isValid).toBe(true);
    expect(result.data?.user.name).toBe('sample-user@example.test');
  });

  it('キャッシュの形状が不正な場合（nameが欠落）でも例外を投げず既存のフォールバックが使われる', () => {
    // Given: JSONとしては正しいがnameフィールドが欠落した壊れたキャッシュ
    storeSupabaseSession({
      userMetadata: {},
    });
    localStorage.setItem(
      VERIFIED_USER_DISPLAY_STORAGE_KEY,
      JSON.stringify({ externalId: 'user-id-1' }),
    );

    // When: validateStoredAuthを実行
    const result = validateStoredAuth();

    // Then: 壊れたキャッシュは使われず、既存のフォールバック（email）が使われる
    expect(result.isValid).toBe(true);
    expect(result.data?.user.name).toBe('sample-user@example.test');
  });
});

/**
 * clearStoredAuth 関数のテスト
 */
describe('clearStoredAuth', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('clearStoredAuthは検証済みユーザーキャッシュも削除する', () => {
    // Given: 検証済みユーザーキャッシュが保存されている
    persistVerifiedUserDisplay(buildVerifiedUser());

    // When: clearStoredAuthを実行
    clearStoredAuth();

    // Then: キャッシュも削除される
    expect(localStorage.getItem(VERIFIED_USER_DISPLAY_STORAGE_KEY)).toBeNull();
  });
});
