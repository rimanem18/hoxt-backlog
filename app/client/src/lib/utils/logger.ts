/**
 * 開発環境専用デバッグログユーティリティ
 *
 * 本番環境ではすべてのログが無効化され、PII漏洩を防止する
 */

import type { AuthValidationResult } from '@/shared/utils/authValidation';

/**
 * 開発環境判定ヘルパー
 *
 * @returns 開発環境であれば true
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 認証関連のデバッグログユーティリティ
 *
 * 本番環境では何も出力せず、開発環境のみでPIIを含まない
 * 安全な情報をログ出力する
 */
export const debugLog = {
  /**
   * 一般的な認証デバッグログ
   *
   * @param message - ログメッセージ
   * @param data - 追加データ（オプショナル）
   */
  auth: (message: string, data?: Record<string, unknown>): void => {
    if (isDevelopment()) {
      console.log(`[Auth Debug] ${message}`, data || '');
    }
  },

  /**
   * 認証検証結果のログ（PII削除済み）
   *
   * validationResult から PII を除外し、安全な情報のみをログ出力
   *
   * @param message - ログメッセージ
   * @param result - 認証検証結果
   */
  redactedAuth: (message: string, result: AuthValidationResult): void => {
    if (isDevelopment()) {
      console.log(`[Auth Debug] ${message}`, {
        isValid: result.isValid,
        reason: result.reason,
        hasData: !!result.data,
        hasToken: !!result.data?.access_token,
      });
    }
  },

  /**
   * ストレージキーのログ（値の存在のみ）
   *
   * @param message - ログメッセージ
   * @param value - チェック対象の値
   */
  storageKey: (message: string, value: string | null | undefined): void => {
    if (isDevelopment()) {
      console.log(`[Auth Debug] ${message}`, value ? '[SET]' : '[NOT SET]');
    }
  },

  /**
   * パース済みデータのログ（PII削除済み）
   *
   * @param message - ログメッセージ
   * @param data - パース済みの認証データ
   */
  parsedData: (
    message: string,
    data: {
      hasAccessToken: boolean;
      hasExpiresAt: boolean;
      hasUser: boolean;
      expiresAtType: string;
    },
  ): void => {
    if (isDevelopment()) {
      console.log(`[Auth Debug] ${message}`, data);
    }
  },

  /**
   * 有効期限チェックのログ
   *
   * @param message - ログメッセージ
   * @param data - 有効期限チェックデータ
   */
  expiryCheck: (
    message: string,
    data: {
      expiresAtMs: number;
      currentTime: number;
      isExpired: boolean;
    },
  ): void => {
    if (isDevelopment()) {
      console.log(`[Auth Debug] ${message}`, data);
    }
  },

  /**
   * トークン検証のログ
   *
   * @param message - ログメッセージ
   * @param data - トークン検証データ
   */
  tokenValidation: (
    message: string,
    data: {
      tokenExists: boolean;
      tokenIsString: boolean;
      tokenHasThreeParts: boolean;
      isValidAccessToken: boolean;
    },
  ): void => {
    if (isDevelopment()) {
      console.log(`[Auth Debug] ${message}`, data);
    }
  },

  /**
   * ユーザー検証のログ（PII削除済み）
   *
   * @param message - ログメッセージ
   * @param data - ユーザー検証データ
   */
  userValidation: (
    message: string,
    data: {
      hasUser: boolean;
      hasUserId: boolean;
      isValidUser: boolean;
    },
  ): void => {
    if (isDevelopment()) {
      console.log(`[Auth Debug] ${message}`, data);
    }
  },

  /**
   * エラーログ（開発環境のみ）
   *
   * @param message - ログメッセージ
   * @param error - エラーオブジェクト
   */
  error: (message: string, error: unknown): void => {
    if (isDevelopment()) {
      console.error(`[Auth Debug] ${message}`, error);
    }
  },

  /**
   * 警告ログ（開発環境のみ）
   *
   * @param message - ログメッセージ
   */
  warn: (message: string): void => {
    if (isDevelopment()) {
      console.warn(`[Auth Debug] ${message}`);
    }
  },
};
