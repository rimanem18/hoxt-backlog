/**
 * 認証検証ユーティリティ
 * provider.tsxとdashboard/page.tsxで共通する認証検証処理を統合
 * DRY原則に基づく重複コード除去とメンテナンス性向上
 */

import type { User } from '@hoxt-backlog/shared-schemas/auth';
import { debugLog } from '@/lib/utils/logger';

/**
 * 環境に応じたSupabaseストレージキーを動的に生成
 *
 * @returns Supabaseセッションストレージキー
 */
export function getSupabaseStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  debugLog.storageKey('NEXT_PUBLIC_SUPABASE_URL', url);

  if (!url) return 'sb-localhost-auth-token';

  // .supabase.co, .supabase.net, カスタムドメイン対応
  const projectRef = url.match(
    /https:\/\/(.+?)\.(?:supabase\.(?:co|net)|[^/]+)/,
  )?.[1];

  const key = projectRef
    ? `sb-${projectRef}-auth-token`
    : 'sb-localhost-auth-token';

  debugLog.auth('Generated key', { keySet: !!key });

  return key;
}

/**
 * バックエンドDB検証済みのユーザー表示情報（name/avatarUrl）を
 * キャッシュするためのlocalStorageキー
 *
 * Supabaseが自身で管理する`sb-*-auth-token`キーとは別に用意し、
 * リロード時にuser_metadataベースのフォールバック値へ
 * 表示名が化けてしまう問題を防ぐ
 */
export const VERIFIED_USER_DISPLAY_STORAGE_KEY =
  'app-verified-user-display-cache';

/**
 * バックエンドDB検証済みのユーザー表示情報をlocalStorageにキャッシュする
 *
 * リロード時の照合キーには externalId（Supabase Auth の user.id と同一）を使う。
 * User.id はアプリ内部DBの主キーであり、Supabaseセッションのuser.idとは別値のため。
 *
 * @param user - バックエンドDBから取得した検証済みユーザー情報
 */
export function persistVerifiedUserDisplay(user: User): void {
  try {
    const cache: VerifiedUserDisplayCache = {
      externalId: user.externalId,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
    };
    localStorage.setItem(
      VERIFIED_USER_DISPLAY_STORAGE_KEY,
      JSON.stringify(cache),
    );
  } catch (error) {
    // localStorage へのアクセス失敗時も安全に処理
    debugLog.error('検証済みユーザー表示情報の保存中にエラーが発生', error);
  }
}

/**
 * Supabase から取得される生のユーザーメタデータ構造
 * OAuth プロバイダーから提供される情報を含む
 */
interface SupabaseUserMetadata {
  avatar_url?: string;
  picture?: string;
  name?: string;
  full_name?: string;
  [key: string]: unknown;
}

/**
 * Supabase から取得される生のユーザー構造
 * user_metadata を含む完全な構造
 */
interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: SupabaseUserMetadata;
  [key: string]: unknown;
}

/**
 * 認証データの基本構造を定義
 * localStorage から取得される認証データの型定義
 */
export interface StoredAuthData {
  user: User | SupabaseUser;
  expires_at: number | string;
  access_token?: string;
  isNewUser?: boolean;
}

/**
 * 検証済み認証データの構造を定義
 * validateStoredAuth 関数が返す検証済みデータの型定義
 * StoredAuthData と異なり、user フィールドは必ず User 型
 */
export interface ValidatedAuthData {
  user: User;
  expires_at: number | string;
  access_token?: string;
  isNewUser?: boolean;
}

/**
 * 認証検証の結果を表すインターフェース
 * 検証成功時は ValidatedAuthData を含み、失敗時はエラー理由を含む
 */
export interface AuthValidationResult {
  isValid: boolean;
  data?: ValidatedAuthData;
  reason?:
    | 'missing'
    | 'parse_error'
    | 'invalid_expires_at'
    | 'expired'
    | 'invalid_token'
    | 'invalid_user';
}

/**
 * バックエンドDB検証済みのユーザー表示情報キャッシュの構造
 *
 * externalId は Supabase Auth の user.id と同一値（JWTのsubクレーム由来）。
 * User.id（アプリ内部DBの主キー）とは異なるため区別する。
 */
type VerifiedUserDisplayCache = Pick<User, 'externalId' | 'name'> & {
  avatarUrl: string | null;
};

/**
 * キャッシュの形状が期待通りかを検証する
 * 破損・改ざんされたJSONを誤ってnameに反映させないための型ガード
 */
function isVerifiedUserDisplayCache(
  value: unknown,
): value is VerifiedUserDisplayCache {
  if (!value || typeof value !== 'object') return false;
  const cache = value as Record<string, unknown>;
  return (
    typeof cache.externalId === 'string' &&
    typeof cache.name === 'string' &&
    (cache.avatarUrl === null || typeof cache.avatarUrl === 'string')
  );
}

/**
 * localStorageのバックエンドDB検証済みキャッシュを読み取り、
 * 現在のSupabaseセッションのuser.id（= externalId）と一致する場合のみ返す
 *
 * JSONパース失敗・形状不正・externalId不一致の場合はnullを返し、
 * 呼び出し元の既存フォールバック結果をそのまま使わせる
 *
 * @param currentExternalId - 現在のSupabaseセッションのuser.id
 * @returns 一致するキャッシュ、またはnull
 */
function readVerifiedUserDisplayCache(
  currentExternalId: string,
): VerifiedUserDisplayCache | null {
  try {
    const raw = localStorage.getItem(VERIFIED_USER_DISPLAY_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isVerifiedUserDisplayCache(parsed)) return null;
    if (parsed.externalId !== currentExternalId) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * localStorage から認証データを取得し、包括的な検証を行う
 *
 * 検証項目:
 * - 認証データの存在確認
 * - JSON形式の妥当性
 * - expires_at の型と値の検証
 * - トークンの有効期限確認
 * - access_token の存在確認
 * - user 情報の完全性確認
 *
 * @returns AuthValidationResult - 検証結果と詳細情報
 */
export function validateStoredAuth(): AuthValidationResult {
  try {
    // localStorage からの認証データ取得
    // データ不存在の場合は早期リターン
    const storageKey = getSupabaseStorageKey();
    debugLog.auth('Storage key set', { keySet: !!storageKey });
    const persistedState = localStorage.getItem(storageKey);
    if (!persistedState) {
      debugLog.auth('No data found in localStorage');
      return {
        isValid: false,
        reason: 'missing',
      };
    }

    // JSON解析と型安全性確保
    // 不正なJSON形式に対する適切なエラー処理
    let authData: StoredAuthData;
    try {
      authData = JSON.parse(persistedState);
      debugLog.parsedData('Parsed data', {
        hasAccessToken: !!authData.access_token,
        hasExpiresAt: !!authData.expires_at,
        hasUser: !!authData.user,
        expiresAtType: typeof authData.expires_at,
      });
    } catch (error) {
      debugLog.error('Parse error', error);
      return {
        isValid: false,
        reason: 'parse_error',
      };
    }

    // expires_at の型検証と数値変換
    // 無効な型の expires_at を検出
    const isValidExpiresAt = typeof authData.expires_at === 'number';
    if (!isValidExpiresAt) {
      debugLog.auth('Invalid expires_at type', {
        expiresAtType: typeof authData.expires_at,
      });
      return {
        isValid: false,
        reason: 'invalid_expires_at',
      };
    }

    // トークン有効期限の確認
    // 期限切れトークンの使用を防止
    const expiresAt = authData.expires_at as number;
    const currentTime = Date.now();
    // expires_atは秒単位なのでミリ秒に変換して比較
    const expiresAtMs = expiresAt * 1000;
    debugLog.expiryCheck('Expiry check', {
      expiresAtMs,
      currentTime,
      isExpired: expiresAtMs <= currentTime,
    });
    if (expiresAtMs <= currentTime) {
      debugLog.auth('Token expired');
      return {
        isValid: false,
        reason: 'expired',
      };
    }

    // access_token の存在と形式確認
    // 基本的なJWT形式（3つのパート）の確認
    const tokenExists = !!authData.access_token;
    const tokenIsString = typeof authData.access_token === 'string';
    const tokenHasThreeParts = !!(
      authData.access_token && authData.access_token.split('.').length === 3
    );

    const isValidAccessToken =
      tokenExists && tokenIsString && tokenHasThreeParts;

    debugLog.tokenValidation('Token validation', {
      tokenExists,
      tokenIsString,
      tokenHasThreeParts,
      isValidAccessToken,
    });

    if (!isValidAccessToken) {
      debugLog.auth('Invalid access token');
      return {
        isValid: false,
        reason: 'invalid_token',
      };
    }

    // ユーザー情報の完全性確認
    // 必須ユーザー情報の存在確認
    const isValidUser = authData.user && typeof authData.user.id === 'string';
    debugLog.userValidation('User validation', {
      hasUser: !!authData.user,
      hasUserId: !!authData.user?.id,
      isValidUser,
    });
    if (!isValidUser) {
      debugLog.auth('Invalid user');
      return {
        isValid: false,
        reason: 'invalid_user',
      };
    }

    // Supabase の user_metadata を User 型に変換
    // name は SupabaseJwtVerifier.getExternalUserInfo() と同じ優先順位に揃える
    const supabaseUser = authData.user as SupabaseUser;
    const fallbackUser: User = {
      ...(authData.user as User),
      name:
        supabaseUser.user_metadata?.name ||
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.email ||
        '',
      avatarUrl:
        supabaseUser.user_metadata?.avatar_url ||
        supabaseUser.user_metadata?.picture ||
        (authData.user as User).avatarUrl ||
        null,
    };

    // バックエンドDB検証済みのキャッシュがあれば、user_metadataベースの
    // フォールバック値（最終的にメールアドレス）より優先して上書きする
    // 照合はSupabaseセッションのuser.id（= externalId）で行う
    const verifiedCache = readVerifiedUserDisplayCache(supabaseUser.id);
    const transformedUser: User = verifiedCache
      ? {
          ...fallbackUser,
          name: verifiedCache.name,
          avatarUrl: verifiedCache.avatarUrl,
        }
      : fallbackUser;

    // すべての検証を通過した場合
    debugLog.auth('Validation successful!');
    return {
      isValid: true,
      data: {
        ...authData,
        user: transformedUser,
      },
    };
  } catch (error) {
    // 予期しないエラー処理として localStorage アクセスエラー等
    debugLog.error('Unexpected error occurred', error);
    return {
      isValid: false,
      reason: 'parse_error',
    };
  }
}

/**
 * 認証エラーの詳細メッセージを取得
 *
 * @param reason - 検証失敗の理由
 * @returns ユーザー向けの分かりやすいエラーメッセージ
 */
export function getAuthErrorMessage(reason: string): string {
  const errorMessages = {
    missing: '認証情報が見つかりません',
    parse_error: '認証データの形式が不正です',
    invalid_expires_at: '有効期限の形式が不正です',
    expired: 'セッションの有効期限が切れました',
    invalid_token: '無効なトークンが検出されました',
    invalid_user: 'ユーザー情報が不正です',
  } as const;

  return (
    errorMessages[reason as keyof typeof errorMessages] ||
    '認証エラーが発生しました'
  );
}

/**
 * 認証状態のクリーンアップを実行
 *
 * localStorage からの認証データ削除
 * エラー発生時も処理を継続
 */
export function clearStoredAuth(): void {
  try {
    const storageKey = getSupabaseStorageKey();
    localStorage.removeItem(storageKey);
    localStorage.removeItem(VERIFIED_USER_DISPLAY_STORAGE_KEY);
  } catch (error) {
    // localStorage へのアクセス失敗時も安全に処理
    console.error('認証データクリア中にエラーが発生:', error);
  }
}
