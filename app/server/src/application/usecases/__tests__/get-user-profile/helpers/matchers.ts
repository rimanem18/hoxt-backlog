/**
 * GetUserProfileUseCase専用カスタムマッチャー定義
 *
 * ユーザープロフィール取得機能のテスト可読性向上とアサーションの簡潔化を目的とした
 * 専用マッチャーを定義。ビジネスロジック特有の検証を抽象化。
 */

import { expect } from 'bun:test';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import type { User } from '@/domain/user/UserEntity';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { ValidationError } from '@/shared/errors/ValidationError';

/**
 * エラーコード別の期待値マッピング（GetUserProfile用）
 */
const GET_USER_PROFILE_ERROR_MAPPINGS = {
  'user-not-found': {
    errorClass: UserNotFoundError,
    expectedMessages: [
      'ユーザーが見つかりません',
      "ユーザーID '12345678-1234-4321-abcd-123456789abc' が見つかりません",
    ],
  },
  validation: {
    errorClass: ValidationError,
    expectedMessages: [
      'ユーザーIDが必要です',
      'ユーザーIDはUUID形式である必要があります',
      'ユーザーIDは有効な文字列である必要があります',
      '無効なユーザーID形式です',
    ],
  },
  infrastructure: {
    errorClass: InfrastructureError,
    expectedMessages: [
      'ユーザー情報の取得に失敗しました',
      'データベース接続エラー',
      'システムエラーが発生しました',
    ],
  },
} as const;

/**
 * GetUserProfile用エラータイプ判定のマッチャー
 *
 * @param received 受信した値（通常はPromise）
 * @param errorType 期待するエラータイプ
 * @returns マッチャー結果
 */
export function toFailWithGetUserProfileError(
  received: Promise<unknown>,
  errorType: keyof typeof GET_USER_PROFILE_ERROR_MAPPINGS,
) {
  const mapping = GET_USER_PROFILE_ERROR_MAPPINGS[errorType];

  return expect(received).rejects.toThrow(mapping.errorClass);
}

/**
 * 特定エラーメッセージの検証マッチャー（GetUserProfile用）
 *
 * @param received 受信した値（通常はPromise）
 * @param expectedMessage 期待するエラーメッセージ
 * @returns マッチャー結果
 */
export function toFailWithGetUserProfileMessage(
  received: Promise<unknown>,
  expectedMessage: string,
) {
  return expect(received).rejects.toThrow(expectedMessage);
}

/**
 * パフォーマンス制限の検証マッチャー（500ms以内）
 *
 * @param executionTime 実行時間（ミリ秒）
 * @returns マッチャー結果
 */
export function toCompleteWithinGetUserProfileTimeLimit(executionTime: number) {
  const PERFORMANCE_LIMIT_MS = 500;
  return expect(executionTime).toBeLessThan(PERFORMANCE_LIMIT_MS);
}

/**
 * ユーザープロフィール取得用ログ出力の検証マッチャー
 *
 * @param mockLogger モックログガー
 * @param level ログレベル
 * @param expectedMessage 期待するメッセージ
 * @param expectedMeta 期待するメタデータ（オプション）
 * @returns マッチャー結果
 */
export function toHaveLoggedGetUserProfileMessage(
  mockLogger: unknown,
  level: 'info' | 'warn' | 'error' | 'debug',
  expectedMessage: string,
  expectedMeta?: Record<string, unknown>,
) {
  const mockLoggerTyped = mockLogger as Record<
    string,
    { mock: { calls: [string, Record<string, unknown>?][] } }
  >;
  const levelMethod = mockLoggerTyped[level];
  if (!levelMethod) {
    throw new Error(`Logger method '${level}' not found`);
  }
  const calls = levelMethod.mock.calls;

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
 * ユーザーエンティティの基本プロパティ検証（GetUserProfile用）
 *
 * @param user ユーザーエンティティ
 * @param expectedProperties 期待するプロパティ
 * @returns マッチャー結果
 */
export function toHaveGetUserProfileProperties(
  user: User,
  expectedProperties: {
    id?: string;
    externalId?: string;
    provider?: string;
    email?: string;
    name?: string;
    avatarUrl?: string | null | undefined;
    // emailVerifiedプロパティは実際のUser型に存在しないため削除
    // isActiveとroleプロパティも実際のUser型に存在しないため削除
  },
) {
  return Object.keys(expectedProperties).every((key) => {
    const userKey = key as keyof User;
    const expectedKey = key as keyof typeof expectedProperties;
    const expectedValue = expectedProperties[expectedKey];
    const actualValue = user[userKey];

    if (key === 'avatarUrl') {
      // avatarUrlは特別扱い: undefinedをnullに正規化
      const normalizedExpected =
        expectedValue === undefined ? null : expectedValue;
      return expect(actualValue).toBe(normalizedExpected);
    }

    // undefinedの場合はnullに正規化してから比較
    const normalizedExpected =
      expectedValue === undefined ? null : expectedValue;
    return expect(actualValue).toBe(normalizedExpected);
  });
}

/**
 * モック関数の呼び出し検証用ヘルパー（GetUserProfile用）
 */
export const GetUserProfileMockHelper = {
  /**
   * モック関数が期待する引数で呼び出されたかを検証
   *
   * @param mockFn モック関数
   * @param expectedArgs 期待する引数の配列
   */
  toHaveBeenCalledWithUserId(mockFn: unknown, expectedUserId: string) {
    return expect(mockFn).toHaveBeenCalledWith(expectedUserId);
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
 * GetUserProfileUseCase専用テストアサーション用ヘルパー関数群
 */
export const GetUserProfileTestMatchers = {
  failWithError: toFailWithGetUserProfileError,
  failWithMessage: toFailWithGetUserProfileMessage,
  completeWithinTimeLimit: toCompleteWithinGetUserProfileTimeLimit,
  haveLoggedMessage: toHaveLoggedGetUserProfileMessage,
  haveUserProperties: toHaveGetUserProfileProperties,
  mock: GetUserProfileMockHelper,
} as const;
