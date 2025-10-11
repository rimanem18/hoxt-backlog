/**
 * EMFテスト用ヘルパー関数
 *
 * CloudWatchMonitoringServiceのテストで使用する共通ヘルパー関数を提供する。
 * Why: JSON.parse(consoleLogMock.mock.calls[0]?.[0]!)の重複を削減
 */

import type { mock } from 'bun:test';

/**
 * EMFペイロード構造の型定義
 */
interface EmfPayload {
  StatusCode?: number;
  '5xxErrors'?: number;
  '4xxErrors'?: number;
  Latency?: number;
  Path?: string;
  Method?: string;
  RequestId?: string;
  Environment?: string;
  _aws: {
    Timestamp: number;
    CloudWatchMetrics: Array<{
      Namespace: string;
      Dimensions: string[][];
      Metrics: Array<{
        Name: string;
        Unit?: string;
      }>;
    }>;
  };
}

/**
 * console.logモックから最初のEMFペイロードを取得してパースする
 *
 * @param consoleLogMock - console.logのモックオブジェクト
 * @returns パース済みEMFペイロード
 */
export const parseEmfPayload = (
  consoleLogMock: ReturnType<typeof mock>,
): EmfPayload => {
  // Why: consoleLogMock.mock.callsの最初の呼び出しの最初の引数を取得
  const firstCall = consoleLogMock.mock.calls[0];
  if (!firstCall || firstCall.length === 0) {
    throw new Error('console.log was not called');
  }

  const rawPayload = firstCall[0];
  if (typeof rawPayload !== 'string') {
    throw new Error('Expected string payload from console.log');
  }

  return JSON.parse(rawPayload) as EmfPayload;
};

/**
 * EMFペイロードがCloudWatch仕様に準拠しているか検証する
 *
 * @param payload - 検証対象のEMFペイロード
 */
export const expectValidEmfStructure = (payload: EmfPayload): void => {
  // Why: _aws.CloudWatchMetrics構造の必須フィールドを検証
  if (!payload._aws) {
    throw new Error('EMF payload missing _aws field');
  }

  if (typeof payload._aws.Timestamp !== 'number') {
    throw new Error('EMF payload missing valid Timestamp');
  }

  if (!Array.isArray(payload._aws.CloudWatchMetrics)) {
    throw new Error('EMF payload missing CloudWatchMetrics array');
  }

  const metricsConfig = payload._aws.CloudWatchMetrics[0];
  if (!metricsConfig) {
    throw new Error('EMF payload CloudWatchMetrics array is empty');
  }

  if (typeof metricsConfig.Namespace !== 'string') {
    throw new Error('EMF payload missing valid Namespace');
  }

  if (!Array.isArray(metricsConfig.Dimensions)) {
    throw new Error('EMF payload missing Dimensions array');
  }

  if (!Array.isArray(metricsConfig.Metrics)) {
    throw new Error('EMF payload missing Metrics array');
  }
};
