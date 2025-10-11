/**
 * metricsMiddleware のテストケース集
 *
 * MonitoringServiceに依存するミドルウェアの振る舞いを検証する
 * CloudWatch固有のロジックはCloudWatchMonitoringService.test.tsで検証
 */

import { describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import type { MonitoringService } from '@/shared/monitoring/MonitoringService';
import { metricsMiddleware } from '../metricsMiddleware';

describe('metricsMiddleware', () => {
  test('正常レスポンス時にrecordHttpStatusが呼ばれる', async () => {
    // Given: モックMonitoringService
    const mockMonitoring: MonitoringService = {
      recordHttpStatus: mock(() => {}),
      recordException: mock(() => {}),
    };

    // Given: 200成功を返すエンドポイント
    const app = new Hono();
    app.use('*', metricsMiddleware(mockMonitoring));
    app.get('/test', (c) => c.json({ message: 'Success' }, 200));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 200レスポンスが返る
    expect(response.status).toBe(200);

    // Then: recordHttpStatusが1回呼ばれる
    expect(mockMonitoring.recordHttpStatus).toHaveBeenCalledTimes(1);

    // Then: 正しいメトリクス情報が渡される
    const call = (mockMonitoring.recordHttpStatus as ReturnType<typeof mock>)
      .mock.calls[0];
    const metrics = call![0];
    expect(metrics).toHaveProperty('status', 200);
    expect(metrics).toHaveProperty('path', '/test');
    expect(metrics).toHaveProperty('method', 'GET');
    expect(metrics).toHaveProperty('latency');
    expect(typeof metrics.latency).toBe('number');
    expect(metrics.latency).toBeGreaterThanOrEqual(0);
  });

  test('5xxエラー時にrecordHttpStatusが呼ばれる', async () => {
    // Given: モックMonitoringService
    const mockMonitoring: MonitoringService = {
      recordHttpStatus: mock(() => {}),
      recordException: mock(() => {}),
    };

    // Given: 500エラーを返すエンドポイント
    const app = new Hono();
    app.use('*', metricsMiddleware(mockMonitoring));
    app.get('/test', (c) => c.json({ error: 'Internal Server Error' }, 500));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 500レスポンスが返る
    expect(response.status).toBe(500);

    // Then: recordHttpStatusが1回呼ばれる
    expect(mockMonitoring.recordHttpStatus).toHaveBeenCalledTimes(1);

    // Then: status=500が渡される
    const call = (mockMonitoring.recordHttpStatus as ReturnType<typeof mock>)
      .mock.calls[0];
    const metrics = call![0];
    expect(metrics).toHaveProperty('status', 500);
  });

  test('4xxエラー時にrecordHttpStatusが呼ばれる', async () => {
    // Given: モックMonitoringService
    const mockMonitoring: MonitoringService = {
      recordHttpStatus: mock(() => {}),
      recordException: mock(() => {}),
    };

    // Given: 404エラーを返すエンドポイント
    const app = new Hono();
    app.use('*', metricsMiddleware(mockMonitoring));
    app.get('/test', (c) => c.json({ error: 'Not Found' }, 404));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 404レスポンスが返る
    expect(response.status).toBe(404);

    // Then: recordHttpStatusが1回呼ばれる
    expect(mockMonitoring.recordHttpStatus).toHaveBeenCalledTimes(1);

    // Then: status=404が渡される
    const call = (mockMonitoring.recordHttpStatus as ReturnType<typeof mock>)
      .mock.calls[0];
    const metrics = call![0];
    expect(metrics).toHaveProperty('status', 404);
  });

  test('x-request-idヘッダーがある場合にrequestIdが渡される', async () => {
    // Given: モックMonitoringService
    const mockMonitoring: MonitoringService = {
      recordHttpStatus: mock(() => {}),
      recordException: mock(() => {}),
    };

    // Given: エンドポイント
    const app = new Hono();
    app.use('*', metricsMiddleware(mockMonitoring));
    app.get('/test', (c) => c.json({ message: 'OK' }, 200));

    // When: x-request-idヘッダー付きでリクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
      headers: {
        'x-request-id': 'test-request-id-123',
      },
    });

    // Then: 200レスポンスが返る
    expect(response.status).toBe(200);

    // Then: requestIdが渡される
    const call = (mockMonitoring.recordHttpStatus as ReturnType<typeof mock>)
      .mock.calls[0];
    const metrics = call![0];
    expect(metrics).toHaveProperty('requestId', 'test-request-id-123');
  });

  test('x-request-idヘッダーがない場合にrequestIdはundefined', async () => {
    // Given: モックMonitoringService
    const mockMonitoring: MonitoringService = {
      recordHttpStatus: mock(() => {}),
      recordException: mock(() => {}),
    };

    // Given: エンドポイント
    const app = new Hono();
    app.use('*', metricsMiddleware(mockMonitoring));
    app.get('/test', (c) => c.json({ message: 'OK' }, 200));

    // When: x-request-idヘッダーなしでリクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 200レスポンスが返る
    expect(response.status).toBe(200);

    // Then: requestIdはundefined
    const call = (mockMonitoring.recordHttpStatus as ReturnType<typeof mock>)
      .mock.calls[0];
    const metrics = call![0];
    expect(metrics.requestId).toBeUndefined();
  });

  test('ハンドラーで例外が発生してもrecordHttpStatusが呼ばれる（try/finally保証）', async () => {
    // Given: モックMonitoringService
    const mockMonitoring: MonitoringService = {
      recordHttpStatus: mock(() => {}),
      recordException: mock(() => {}),
    };

    // Given: 例外をスローするエンドポイント
    const app = new Hono();
    app.use('*', metricsMiddleware(mockMonitoring));
    app.get('/test', () => {
      throw new Error('Test error');
    });

    // When/Then: リクエストを実行（例外は上位でキャッチされる）
    try {
      await app.request('http://localhost/test', { method: 'GET' });
    } catch (error) {
      // 例外を無視（メトリクス記録の検証が目的）
    }

    // Then: 例外が発生してもrecordHttpStatusが呼ばれる（finallyブロック）
    expect(mockMonitoring.recordHttpStatus).toHaveBeenCalledTimes(1);
  });
});
