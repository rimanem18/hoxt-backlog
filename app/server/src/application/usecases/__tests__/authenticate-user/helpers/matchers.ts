/**
 * カスタムマッチャー定義
 *
 * テストの可読性向上とアサーションの簡潔化を目的とした
 * 専用マッチャーを定義。ビジネスロジック特有の検証を抽象化。
 */

import { expect } from 'bun:test';
import { AuthenticationError } from '../../../../../domain/user/errors/AuthenticationError';
import type { User } from '../../../../../domain/user/UserEntity';
import { ExternalServiceError } from '../../../../../shared/errors/ExternalServiceError';
import { InfrastructureError } from '../../../../../shared/errors/InfrastructureError';
import { ValidationError } from '../../../../../shared/errors/ValidationError';

/**
 * エラーコード別の期待値マッピング
 */
const ERROR_MAPPINGS = {
  validation: {
    errorClass: ValidationError,
    expectedMessages: [
      'JWTトークンが必要です',
      'JWT検証に失敗しました',
      'JWTサイズが上限を超えています',
    ],
  },
  authentication: {
    errorClass: AuthenticationError,
    expectedMessages: ['認証トークンが無効です', '認証に失敗しました'],
  },
  infrastructure: {
    errorClass: InfrastructureError,
    expectedMessages: [
      'ユーザー情報の取得に失敗しました',
      'データベース接続エラー',
    ],
  },
  'external-service': {
    errorClass: ExternalServiceError,
    expectedMessages: [
      '認証サービスが一時的に利用できません',
      '外部サービスエラー',
    ],
  },
} as const;

/**
 * エラータイプ判定のマッチャー
 *
 * @param received 受信した値（通常はPromise）
 * @param errorType 期待するエラータイプ
 * @returns マッチャー結果
 */
export function toFailWithError(
  received: Promise<unknown>,
  errorType: keyof typeof ERROR_MAPPINGS,
) {
  const mapping = ERROR_MAPPINGS[errorType];

  return expect(received).rejects.toThrow(mapping.errorClass);
}

/**
 * 特定エラーメッセージの検証マッチャー
 *
 * @param received 受信した値（通常はPromise）
 * @param expectedMessage 期待するエラーメッセージ
 * @returns マッチャー結果
 */
export function toFailWithMessage(
  received: Promise<unknown>,
  expectedMessage: string,
) {
  return expect(received).rejects.toThrow(expectedMessage);
}

/**
 * パフォーマンス制限の検証マッチャー
 *
 * @param executionTime 実行時間（ミリ秒）
 * @param limit 制限時間（ミリ秒）
 * @returns マッチャー結果
 */
export function toCompleteWithinTimeLimit(
  executionTime: number,
  limit: number,
) {
  return expect(executionTime).toBeLessThan(limit);
}

/**
 * ログ出力の検証マッチャー
 *
 * @param mockLogger モックログガー
 * @param level ログレベル
 * @param expectedMessage 期待するメッセージ
 * @param expectedMeta 期待するメタデータ（オプション）
 * @returns マッチャー結果
 */
export function toHaveLoggedMessage(
  mockLogger: unknown,
  level: 'info' | 'warn' | 'error' | 'debug',
  expectedMessage: string,
  expectedMeta?: Record<string, unknown>,
) {
  const calls = (
    mockLogger as Record<
      string,
      { mock: { calls: [string, Record<string, unknown>?][] } }
    >
  )[level].mock.calls;

  const matchingCall = calls.find(
    (call: [string, Record<string, unknown>?]) => {
      const [message, meta] = call;
      if (message !== expectedMessage) return false;

      if (expectedMeta) {
        return Object.keys(expectedMeta).every(
          (key) => meta && meta[key] === expectedMeta[key],
        );
      }

      return true;
    },
  );

  return expect(matchingCall).toBeDefined();
}

/**
 * ユーザーエンティティの基本プロパティ検証
 *
 * @param user ユーザーエンティティ
 * @param expectedProperties 期待するプロパティ
 * @returns マッチャー結果
 */
export function toHaveUserProperties(
  user: User,
  expectedProperties: {
    id?: string;
    externalId?: string;
    provider?: string;
    email?: string;
    name?: string;
  },
) {
  return Object.keys(expectedProperties).every((key) => {
    return expect(user[key]).toBe(
      expectedProperties[key as keyof typeof expectedProperties],
    );
  });
}

/**
 * 時間が現在時刻に近いことの検証（5秒以内）
 *
 * @param dateValue 検証対象の日時
 * @param referenceTime 基準時刻（デフォルトは現在時刻）
 * @param toleranceMs 許容誤差（ミリ秒、デフォルト5秒）
 * @returns マッチャー結果
 */
export function toBeRecentTime(
  dateValue: Date,
  referenceTime: number = Date.now(),
  toleranceMs: number = 5000,
) {
  const diff = Math.abs(dateValue.getTime() - referenceTime);
  return expect(diff).toBeLessThan(toleranceMs);
}

/**
 * JWT構造の基本検証
 *
 * @param jwt JWTトークン文字列
 * @returns マッチャー結果
 */
export function toBeValidJwtStructure(jwt: string) {
  const parts = jwt.split('.');
  expect(parts).toHaveLength(3);

  // ヘッダー、ペイロード、署名の存在確認
  return parts.every((part) => {
    expect(part).toBeTruthy();
    expect(part.length).toBeGreaterThan(0);
    return true;
  });
}

/**
 * モック関数の呼び出し検証用ヘルパー
 */
export const MockHelper = {
  /**
   * モック関数が期待する引数で呼び出されたかを検証
   *
   * @param mockFn モック関数
   * @param expectedArgs 期待する引数の配列
   */
  toHaveBeenCalledWithArgs(mockFn: unknown, ...expectedArgs: unknown[]) {
    return expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
  },

  /**
   * モック関数が期待回数だけ呼び出されたかを検証
   *
   * @param mockFn モック関数
   * @param times 期待する呼び出し回数
   */
  toHaveBeenCalledTimes(mockFn: unknown, times: number) {
    return expect(mockFn).toHaveBeenCalledTimes(times);
  },

  /**
   * モック関数が呼び出されていないことを検証
   *
   * @param mockFn モック関数
   */
  notToHaveBeenCalled(mockFn: unknown) {
    return expect(mockFn).not.toHaveBeenCalled();
  },
} as const;

/**
 * テストアサーション用ヘルパー関数群
 */
export const TestMatchers = {
  failWithError: toFailWithError,
  failWithMessage: toFailWithMessage,
  completeWithinTimeLimit: toCompleteWithinTimeLimit,
  haveLoggedMessage: toHaveLoggedMessage,
  haveUserProperties: toHaveUserProperties,
  beRecentTime: toBeRecentTime,
  beValidJwtStructure: toBeValidJwtStructure,
  mock: MockHelper,
} as const;
