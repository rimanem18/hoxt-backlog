/**
 * CloudWatchMonitoringService のテストケース集
 *
 * Embedded Metric Format (EMF) ペイロード生成ロジックを検証する
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { HttpStatusMetrics } from '@/shared/monitoring/MonitoringService';
import { CloudWatchMonitoringService } from '../CloudWatchMonitoringService';
import {
  expectValidEmfStructure,
  parseEmfPayload,
} from './helpers/emfTestHelpers';

// console.logをモック化してEMF出力を検証
let consoleLogMock: ReturnType<typeof mock>;
let originalConsoleLog: typeof console.log;

beforeEach(() => {
  originalConsoleLog = console.log;
  consoleLogMock = mock(() => {});
  console.log = consoleLogMock;
});

afterEach(() => {
  console.log = originalConsoleLog;
  mock.restore();
});

describe('CloudWatchMonitoringService', () => {
  describe('recordHttpStatus', () => {
    test('5xxエラー時に5xxErrors=1を出力する', () => {
      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: 500エラーのメトリクス
      const metrics: HttpStatusMetrics = {
        status: 500,
        path: '/api/test',
        method: 'GET',
        latency: 150,
      };

      // When: recordHttpStatusを呼ぶ
      service.recordHttpStatus(metrics);

      // Then: console.logが呼ばれる
      expect(consoleLogMock).toHaveBeenCalledTimes(1);

      // Then: EMFペイロードが出力される
      const loggedPayload = parseEmfPayload(consoleLogMock);
      expect(loggedPayload).toHaveProperty('StatusCode', 500);
      expect(loggedPayload).toHaveProperty('5xxErrors', 1);
      expect(loggedPayload).toHaveProperty('4xxErrors', 0);
      expect(loggedPayload).toHaveProperty('Latency', 150);
      expect(loggedPayload).toHaveProperty('Path', '/api/test');
      expect(loggedPayload).toHaveProperty('Method', 'GET');
    });

    test('4xxエラー時に4xxErrors=1を出力する', () => {
      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: 404エラーのメトリクス
      const metrics: HttpStatusMetrics = {
        status: 404,
        path: '/api/not-found',
        method: 'GET',
        latency: 50,
      };

      // When: recordHttpStatusを呼ぶ
      service.recordHttpStatus(metrics);

      // Then: EMFペイロードが出力される
      const loggedPayload = parseEmfPayload(consoleLogMock);
      expect(loggedPayload).toHaveProperty('StatusCode', 404);
      expect(loggedPayload).toHaveProperty('5xxErrors', 0);
      expect(loggedPayload).toHaveProperty('4xxErrors', 1);
    });

    test('2xx成功時は5xxErrors=0, 4xxErrors=0を出力する（メトリクススキーマ一貫性）', () => {
      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: 200成功のメトリクス
      const metrics: HttpStatusMetrics = {
        status: 200,
        path: '/api/success',
        method: 'POST',
        latency: 30,
      };

      // When: recordHttpStatusを呼ぶ
      service.recordHttpStatus(metrics);

      // Then: EMFペイロードに5xxErrors=0, 4xxErrors=0が含まれる（常に宣言方式）
      const loggedPayload = parseEmfPayload(consoleLogMock);
      expect(loggedPayload).toHaveProperty('StatusCode', 200);
      expect(loggedPayload).toHaveProperty('5xxErrors', 0);
      expect(loggedPayload).toHaveProperty('4xxErrors', 0);
    });

    test('requestIdがある場合にRequestIdフィールドが含まれる', () => {
      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: requestId付きメトリクス
      const metrics: HttpStatusMetrics = {
        status: 200,
        path: '/api/test',
        method: 'GET',
        latency: 100,
        requestId: 'test-request-id-456',
      };

      // When: recordHttpStatusを呼ぶ
      service.recordHttpStatus(metrics);

      // Then: RequestIdフィールドが含まれる
      const loggedPayload = parseEmfPayload(consoleLogMock);
      expect(loggedPayload).toHaveProperty('RequestId', 'test-request-id-456');
    });

    test('requestIdがない場合にRequestIdフィールドは含まれない', () => {
      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: requestIdなしメトリクス
      const metrics: HttpStatusMetrics = {
        status: 200,
        path: '/api/test',
        method: 'GET',
        latency: 100,
      };

      // When: recordHttpStatusを呼ぶ
      service.recordHttpStatus(metrics);

      // Then: RequestIdフィールドは含まれない
      const loggedPayload = parseEmfPayload(consoleLogMock);
      expect(loggedPayload).not.toHaveProperty('RequestId');
    });

    test('EMFペイロード構造がCloudWatch仕様に準拠している', () => {
      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: メトリクス
      const metrics: HttpStatusMetrics = {
        status: 200,
        path: '/api/test',
        method: 'GET',
        latency: 80,
      };

      // When: recordHttpStatusを呼ぶ
      service.recordHttpStatus(metrics);

      // Then: EMFペイロード構造を検証
      const loggedPayload = parseEmfPayload(consoleLogMock);

      // Why: ヘルパー関数で基本構造検証を一括実施
      expectValidEmfStructure(loggedPayload);

      // Why: メトリクス固有の検証のみここで実施
      const metricsConfig = loggedPayload._aws.CloudWatchMetrics[0];
      if (!metricsConfig) {
        throw new Error('metricsConfig is undefined');
      }

      // Metricsが常に3つ宣言されていることを検証（P0/P1教訓）
      expect(metricsConfig.Metrics).toHaveLength(3);
      const metricNames = metricsConfig.Metrics.map(
        (m: { Name: string }) => m.Name,
      );
      expect(metricNames).toContain('Latency');
      expect(metricNames).toContain('5xxErrors');
      expect(metricNames).toContain('4xxErrors');
    });

    test('METRICS_NAMESPACE環境変数が反映される', () => {
      // Given: METRICS_NAMESPACE環境変数を設定
      const originalEnv = process.env.METRICS_NAMESPACE;
      process.env.METRICS_NAMESPACE = 'CustomNamespace/Test';

      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: メトリクス
      const metrics: HttpStatusMetrics = {
        status: 200,
        path: '/api/test',
        method: 'GET',
        latency: 60,
      };

      // When: recordHttpStatusを呼ぶ
      service.recordHttpStatus(metrics);

      // Then: カスタムNamespaceが使用される
      const loggedPayload = parseEmfPayload(consoleLogMock);
      const namespace = loggedPayload._aws.CloudWatchMetrics[0]?.Namespace;
      expect(namespace).toBe('CustomNamespace/Test');

      // Cleanup
      if (originalEnv === undefined) {
        delete process.env.METRICS_NAMESPACE;
      } else {
        process.env.METRICS_NAMESPACE = originalEnv;
      }
    });

    test('ENVIRONMENT環境変数が反映される', () => {
      // Given: ENVIRONMENT環境変数を設定
      const originalEnv = process.env.ENVIRONMENT;
      process.env.ENVIRONMENT = 'production';

      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: メトリクス
      const metrics: HttpStatusMetrics = {
        status: 200,
        path: '/api/test',
        method: 'GET',
        latency: 70,
      };

      // When: recordHttpStatusを呼ぶ
      service.recordHttpStatus(metrics);

      // Then: Environment=productionが使用される
      const loggedPayload = parseEmfPayload(consoleLogMock);
      expect(loggedPayload.Environment).toBe('production');

      // Cleanup
      if (originalEnv === undefined) {
        delete process.env.ENVIRONMENT;
      } else {
        process.env.ENVIRONMENT = originalEnv;
      }
    });
  });

  describe('recordException', () => {
    test('エラー情報を構造化してconsole.errorに出力する', () => {
      // Given: console.errorをモック化
      const consoleErrorMock = mock(() => {});
      const originalConsoleError = console.error;
      console.error = consoleErrorMock;

      // Given: CloudWatchMonitoringServiceインスタンス
      const service = new CloudWatchMonitoringService();

      // Given: エラーとコンテキスト
      const error = new Error('Test error');
      const context = { userId: 'user-123', path: '/api/test' };

      // When: recordExceptionを呼ぶ
      service.recordException(error, context);

      // Then: console.errorが呼ばれる
      expect(consoleErrorMock).toHaveBeenCalledTimes(1);

      // Then: 構造化エラー情報が出力される
      const calls = consoleErrorMock.mock.calls as unknown as Array<
        [string, Record<string, unknown>]
      >;
      expect(calls[0]?.[0]).toBe('Exception occurred');
      expect(calls[0]?.[1]).toHaveProperty('error', 'Test error');
      expect(calls[0]?.[1]).toHaveProperty('stack');
      expect(calls[0]?.[1]).toHaveProperty('userId', 'user-123');
      expect(calls[0]?.[1]).toHaveProperty('path', '/api/test');

      // Cleanup
      console.error = originalConsoleError;
    });
  });
});
