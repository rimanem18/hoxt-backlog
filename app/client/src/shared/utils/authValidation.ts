/**
 * 認証検証ユーティリティ
 * provider.tsxとdashboard/page.tsxで共通する認証検証処理を統合
 * DRY原則に基づく重複コード除去とメンテナンス性向上
 */

import type { User } from '@/packages/shared-schemas/src/auth';

/**
 * 環境に応じたSupabaseストレージキーを動的に生成
 *
 * @returns Supabaseセッションストレージキー
 */
export function getSupabaseStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('[getSupabaseStorageKey] NEXT_PUBLIC_SUPABASE_URL:', url);
  }

  if (!url) return 'sb-localhost-auth-token';

  // .supabase.co, .supabase.net, カスタムドメイン対応
  const projectRef = url.match(
    /https:\/\/(.+?)\.(?:supabase\.(?:co|net)|[^/]+)/,
  )?.[1];

  const key = projectRef
    ? `sb-${projectRef}-auth-token`
    : 'sb-localhost-auth-token';

  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('[getSupabaseStorageKey] Generated key:', key);
  }

  return key;
}

/**
 * Supabase から取得される生のユーザーメタデータ構造
 * OAuth プロバイダーから提供される情報を含む
 */
interface SupabaseUserMetadata {
  avatar_url?: string;
  picture?: string;
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
 * 認証検証の結果を表すインターフェース
 * 検証成功時はデータを含み、失敗時はエラー理由を含む
 */
export interface AuthValidationResult {
  isValid: boolean;
  data?: StoredAuthData;
  reason?:
    | 'missing'
    | 'parse_error'
    | 'invalid_expires_at'
    | 'expired'
    | 'invalid_token'
    | 'invalid_user';
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
    const persistedState = localStorage.getItem(storageKey);
    if (!persistedState) {
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
    } catch {
      return {
        isValid: false,
        reason: 'parse_error',
      };
    }

    // expires_at の型検証と数値変換
    // 無効な型の expires_at を検出
    const isValidExpiresAt = typeof authData.expires_at === 'number';
    if (!isValidExpiresAt) {
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
    if (expiresAtMs <= currentTime) {
      return {
        isValid: false,
        reason: 'expired',
      };
    }

    // access_token の存在と形式確認
    // 基本的なJWT形式（3つのパート）の確認
    const tokenExists = !!authData.access_token;
    const tokenIsString = typeof authData.access_token === 'string';
    const tokenHasThreeParts =
      authData.access_token && authData.access_token.split('.').length === 3;

    const isValidAccessToken =
      tokenExists && tokenIsString && tokenHasThreeParts;

    if (!isValidAccessToken) {
      return {
        isValid: false,
        reason: 'invalid_token',
      };
    }

    // ユーザー情報の完全性確認
    // 必須ユーザー情報の存在確認
    const isValidUser = authData.user && typeof authData.user.id === 'string';
    if (!isValidUser) {
      return {
        isValid: false,
        reason: 'invalid_user',
      };
    }

    // Supabase の user_metadata を User 型に変換
    // OAuth プロバイダーから取得した avatar_url を avatarUrl に変換
    const supabaseUser = authData.user as SupabaseUser;
    const transformedUser: User = {
      ...(authData.user as User),
      avatarUrl:
        supabaseUser.user_metadata?.avatar_url ||
        supabaseUser.user_metadata?.picture ||
        (authData.user as User).avatarUrl ||
        null,
    };

    // すべての検証を通過した場合
    return {
      isValid: true,
      data: {
        ...authData,
        user: transformedUser,
      },
    };
  } catch (error) {
    // 予期しないエラー処理として localStorage アクセスエラー等
    console.error('validateStoredAuth: Unexpected error occurred:', error);
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
  } catch (error) {
    // localStorage へのアクセス失敗時も安全に処理
    console.error('認証データクリア中にエラーが発生:', error);
  }
}
