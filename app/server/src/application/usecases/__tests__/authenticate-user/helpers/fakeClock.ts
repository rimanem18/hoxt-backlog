/**
 * 固定時間制御ユーティリティ
 *
 * テスト時の時間制御を提供し、決定的なテスト実行を可能にする。
 * パフォーマンステストや時間に依存する処理のテストで使用。
 */

/**
 * FakeClock制御インターフェース
 */
export interface FakeClock {
  /**
   * 現在時刻を取得
   */
  readonly now: () => number;

  /**
   * 時間を進める
   *
   * @param milliseconds 進める時間（ミリ秒）
   */
  readonly advance: (milliseconds: number) => void;

  /**
   * 固定時刻を設定
   *
   * @param timestamp 固定したい時刻（ミリ秒）
   */
  readonly setTime: (timestamp: number) => void;

  /**
   * 元のDate.now関数（内部使用）
   */
  originalDateNow?: () => number;

  /**
   * 現在時刻をDate型で取得
   */
  readonly nowAsDate: () => Date;

  /**
   * 時間制御をリセット（実際の時刻に戻す）
   */
  readonly reset: () => void;
}

/**
 * テスト用固定時計の作成
 *
 * 時間に依存するテストを決定的に実行するための時間制御機能を提供。
 * パフォーマンス測定、タイムアウト処理、日時記録などのテストで活用。
 *
 * @param initialTime 初期時刻（ミリ秒、デフォルトは2025-08-20 10:00:00 JST）
 * @returns 時間制御インターフェース
 */
export function createFakeClock(
  initialTime: number = new Date('2025-08-20T10:00:00+09:00').getTime(),
): FakeClock {
  let currentTime = initialTime;
  const fakeClock: FakeClock = {
    now: () => currentTime,

    advance: (milliseconds: number) => {
      if (milliseconds < 0) {
        throw new Error('時間は負の値で進められません');
      }
      currentTime += milliseconds;
    },

    setTime: (timestamp: number) => {
      currentTime = timestamp;
    },

    nowAsDate: () => new Date(currentTime),

    reset: () => {
      currentTime = initialTime;
    },
  };

  return fakeClock;
}

/**
 * Date.nowをモック化するヘルパー
 *
 * @param fakeClock 使用するFakeClockインスタンス
 */
export function mockDateNow(fakeClock: FakeClock): void {
  const originalDateNow = Date.now;
  Date.now = fakeClock.now;

  // テスト終了時にクリーンアップできるようにする
  (fakeClock as FakeClock & { originalDateNow: () => number }).originalDateNow =
    originalDateNow;
}

/**
 * Date.nowのモック化を解除するヘルパー
 *
 * @param fakeClock 使用したFakeClockインスタンス
 */
export function restoreDateNow(fakeClock: FakeClock): void {
  const originalDateNow = (
    fakeClock as FakeClock & { originalDateNow?: () => number }
  ).originalDateNow;
  if (originalDateNow) {
    Date.now = originalDateNow;
  }
}

/**
 * パフォーマンステスト用タイマー
 */
export interface PerformanceTimer {
  readonly start: () => void;
  readonly end: () => number;
  readonly getElapsed: () => number;
}

/**
 * パフォーマンステスト用のタイマーを作成
 *
 * @param fakeClock 使用するFakeClockインスタンス
 * @returns パフォーマンスタイマー
 */
export function createPerformanceTimer(fakeClock: FakeClock): PerformanceTimer {
  let startTime = 0;
  let endTime = 0;

  return {
    start: () => {
      startTime = fakeClock.now();
      endTime = 0;
    },

    end: () => {
      endTime = fakeClock.now();
      return endTime - startTime;
    },

    getElapsed: () => {
      const currentEndTime = endTime || fakeClock.now();
      return currentEndTime - startTime;
    },
  };
}

/**
 * 共通の時刻定数
 */
export const TIME_CONSTANTS = {
  // 2025-08-20 10:00:00 JST のエポック時刻
  BASE_TIME: new Date('2025-08-20T10:00:00+09:00').getTime(),

  // よく使用される時間間隔（ミリ秒）
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,

  // パフォーマンス制限時間
  EXISTING_USER_LIMIT: 1000, // 既存ユーザー認証: 1秒
  NEW_USER_LIMIT: 2000, // JIT作成: 2秒
} as const;
