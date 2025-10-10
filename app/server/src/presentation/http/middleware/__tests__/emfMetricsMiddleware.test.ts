/**
 * emfMetricsMiddleware のテストケース集
 *
 * Embedded Metric Format (EMF) によるHTTPメトリクス記録を検証する
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import { emfMetricsMiddleware } from '../emfMetricsMiddleware';

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

describe('emfMetricsMiddleware', () => {
  test('5xxエラー時に5xxErrorsメトリクスを出力する', async () => {
    // Given: 500エラーを返すエンドポイント
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ error: 'Internal Server Error' }, 500));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 500レスポンスが返る
    expect(response.status).toBe(500);

    // Then: console.logが呼ばれる
    expect(consoleLogMock).toHaveBeenCalledTimes(1);

    // Then: EMFペイロードが出力される
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload).toHaveProperty('_aws');
    expect(loggedPayload).toHaveProperty('StatusCode', 500);
    expect(loggedPayload).toHaveProperty('5xxErrors', 1);
    expect(loggedPayload).toHaveProperty('Latency');
    expect(loggedPayload).toHaveProperty('Path', '/test');
    expect(loggedPayload).toHaveProperty('Method', 'GET');
  });

  test('2xx成功時は5xxErrors=0を出力する', async () => {
    // Given: 200成功を返すエンドポイント
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ message: 'Success' }, 200));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 200レスポンスが返る
    expect(response.status).toBe(200);

    // Then: console.logが呼ばれる
    expect(consoleLogMock).toHaveBeenCalledTimes(1);

    // Then: EMFペイロードに5xxErrors=0が含まれる（メトリクススキーマ一貫性）
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload).toHaveProperty('_aws');
    expect(loggedPayload).toHaveProperty('StatusCode', 200);
    expect(loggedPayload).toHaveProperty('5xxErrors', 0);
    expect(loggedPayload).toHaveProperty('Latency');
  });

  test('EMFペイロード構造がCloudWatch仕様に準拠している', async () => {
    // Given: エンドポイント
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ message: 'OK' }, 200));

    // When: リクエストを実行
    await app.request('http://localhost/test', { method: 'GET' });

    // Then: EMFペイロード構造を検証
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);

    // _aws.CloudWatchMetrics構造の検証
    expect(loggedPayload._aws).toHaveProperty('Timestamp');
    expect(typeof loggedPayload._aws.Timestamp).toBe('number');

    expect(loggedPayload._aws).toHaveProperty('CloudWatchMetrics');
    expect(Array.isArray(loggedPayload._aws.CloudWatchMetrics)).toBe(true);

    const metricsConfig = loggedPayload._aws.CloudWatchMetrics[0];
    expect(metricsConfig).toHaveProperty('Namespace');
    expect(typeof metricsConfig.Namespace).toBe('string');

    expect(metricsConfig).toHaveProperty('Dimensions');
    expect(Array.isArray(metricsConfig.Dimensions)).toBe(true);
    expect(Array.isArray(metricsConfig.Dimensions[0])).toBe(true);

    expect(metricsConfig).toHaveProperty('Metrics');
    expect(Array.isArray(metricsConfig.Metrics)).toBe(true);

    // Metricsの構造検証
    const latencyMetric = metricsConfig.Metrics.find(
      (m: { Name: string }) => m.Name === 'Latency',
    );
    expect(latencyMetric).toBeDefined();
    expect(latencyMetric).toHaveProperty('Name', 'Latency');
    expect(latencyMetric).toHaveProperty('Unit', 'Milliseconds');

    // Latency値の検証
    expect(loggedPayload).toHaveProperty('Latency');
    expect(typeof loggedPayload.Latency).toBe('number');
    expect(loggedPayload.Latency).toBeGreaterThanOrEqual(0);
  });

  test('環境変数METRICS_NAMESPACEが反映される', async () => {
    // Given: METRICS_NAMESPACE環境変数を設定
    const originalNamespace = process.env.METRICS_NAMESPACE;
    process.env.METRICS_NAMESPACE = 'TestNamespace/Metrics';

    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ message: 'OK' }, 200));

    // When: リクエストを実行
    await app.request('http://localhost/test', { method: 'GET' });

    // Then: EMFペイロードにカスタムNamespaceが含まれる
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload._aws.CloudWatchMetrics[0].Namespace).toBe(
      'TestNamespace/Metrics',
    );

    // Cleanup
    if (originalNamespace !== undefined) {
      process.env.METRICS_NAMESPACE = originalNamespace;
    } else {
      delete process.env.METRICS_NAMESPACE;
    }
  });

  test('METRICS_NAMESPACE未設定時にデフォルト値を使用する', async () => {
    // Given: METRICS_NAMESPACE環境変数を削除
    const originalNamespace = process.env.METRICS_NAMESPACE;
    delete process.env.METRICS_NAMESPACE;

    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ message: 'OK' }, 200));

    // When: リクエストを実行
    await app.request('http://localhost/test', { method: 'GET' });

    // Then: デフォルトNamespaceが使用される
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload._aws.CloudWatchMetrics[0].Namespace).toBe(
      'Application/Monitoring',
    );

    // Cleanup
    if (originalNamespace !== undefined) {
      process.env.METRICS_NAMESPACE = originalNamespace;
    }
  });

  test('エラーレスポンス時もメトリクスを出力する（try/finallyの検証）', async () => {
    // Given: 500エラーレスポンスを返すハンドラー
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => {
      // エラーハンドリングミドルウェアで処理されたエラーレスポンスを想定
      return c.json({ error: 'Internal Server Error' }, 500);
    });

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 500レスポンスが返る
    expect(response.status).toBe(500);

    // Then: console.logが呼ばれる（finally句で実行）
    expect(consoleLogMock).toHaveBeenCalledTimes(1);

    // Then: EMFペイロードが出力される
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload).toHaveProperty('_aws');
    expect(loggedPayload).toHaveProperty('StatusCode', 500);
    expect(loggedPayload).toHaveProperty('5xxErrors', 1);
    expect(loggedPayload).toHaveProperty('Latency');
  });

  test('4xxエラー時は5xxErrors=0を出力する', async () => {
    // Given: 404エラーを返すエンドポイント
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ error: 'Not Found' }, 404));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 404レスポンスが返る
    expect(response.status).toBe(404);

    // Then: EMFペイロードに5xxErrors=0が含まれる（メトリクススキーマ一貫性）
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload).toHaveProperty('StatusCode', 404);
    expect(loggedPayload).toHaveProperty('5xxErrors', 0);
  });

  test('センシティブデータを記録しない（リクエストボディ/ヘッダー除外）', async () => {
    // Given: センシティブデータを含むリクエスト
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.post('/test', (c) => c.json({ message: 'OK' }, 200));

    // When: センシティブデータを含むPOSTリクエスト
    await app.request('http://localhost/test', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer secret-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: 'secret-password' }),
    });

    // Then: EMFペイロードにセンシティブデータが含まれない
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    const payloadString = JSON.stringify(loggedPayload);

    expect(payloadString).not.toContain('secret-token');
    expect(payloadString).not.toContain('secret-password');
    expect(payloadString).not.toContain('Authorization');

    // Then: メトリクス情報のみが含まれる
    expect(loggedPayload).toHaveProperty('StatusCode');
    expect(loggedPayload).toHaveProperty('Path');
    expect(loggedPayload).toHaveProperty('Method');
    expect(loggedPayload).toHaveProperty('Latency');
  });

  test('Environment次元がENVIRONMENT環境変数から正しく設定される', async () => {
    // Given: ENVIRONMENT環境変数を設定
    const originalEnvironment = process.env.ENVIRONMENT;
    process.env.ENVIRONMENT = 'production';

    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ message: 'OK' }, 200));

    // When: リクエストを実行
    await app.request('http://localhost/test', { method: 'GET' });

    // Then: EMFペイロードにEnvironment=productionが含まれる
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload).toHaveProperty('Environment', 'production');

    // Then: Dimensions配列にEnvironmentが含まれる
    const dimensions = loggedPayload._aws.CloudWatchMetrics[0].Dimensions[0];
    expect(dimensions).toContain('Environment');

    // Cleanup
    if (originalEnvironment !== undefined) {
      process.env.ENVIRONMENT = originalEnvironment;
    } else {
      delete process.env.ENVIRONMENT;
    }
  });

  test('4xxエラー時は4xxErrors=1を出力する', async () => {
    // Given: 400エラーを返すエンドポイント
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ error: 'Bad Request' }, 400));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 400レスポンスが返る
    expect(response.status).toBe(400);

    // Then: console.logが呼ばれる
    expect(consoleLogMock).toHaveBeenCalledTimes(1);

    // Then: EMFペイロードに4xxErrors=1が含まれる
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload).toHaveProperty('_aws');
    expect(loggedPayload).toHaveProperty('StatusCode', 400);
    expect(loggedPayload).toHaveProperty('4xxErrors', 1);
    expect(loggedPayload).toHaveProperty('5xxErrors', 0);
    expect(loggedPayload).toHaveProperty('Latency');
    expect(loggedPayload).toHaveProperty('Path', '/test');
    expect(loggedPayload).toHaveProperty('Method', 'GET');
  });

  test('2xx成功時は4xxErrors=0を出力する', async () => {
    // Given: 200成功を返すエンドポイント
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ message: 'Success' }, 200));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 200レスポンスが返る
    expect(response.status).toBe(200);

    // Then: console.logが呼ばれる
    expect(consoleLogMock).toHaveBeenCalledTimes(1);

    // Then: EMFペイロードに4xxErrors=0が含まれる（メトリクススキーマ一貫性）
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload).toHaveProperty('_aws');
    expect(loggedPayload).toHaveProperty('StatusCode', 200);
    expect(loggedPayload).toHaveProperty('4xxErrors', 0);
    expect(loggedPayload).toHaveProperty('5xxErrors', 0);
    expect(loggedPayload).toHaveProperty('Latency');
  });

  test('5xxエラー時は4xxErrors=0を出力する', async () => {
    // Given: 500エラーを返すエンドポイント
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/test', (c) => c.json({ error: 'Internal Server Error' }, 500));

    // When: リクエストを実行
    const response = await app.request('http://localhost/test', {
      method: 'GET',
    });

    // Then: 500レスポンスが返る
    expect(response.status).toBe(500);

    // Then: EMFペイロードに4xxErrors=0が含まれる（メトリクススキーマ一貫性）
    const loggedPayload = JSON.parse(consoleLogMock.mock.calls[0]?.[0]!);
    expect(loggedPayload).toHaveProperty('StatusCode', 500);
    expect(loggedPayload).toHaveProperty('4xxErrors', 0);
    expect(loggedPayload).toHaveProperty('5xxErrors', 1);
  });

  test('メトリクススキーマが常に一貫している（すべてのステータスコードで5xxErrors/4xxErrorsを宣言）', async () => {
    // Given: 異なるステータスコードを返すエンドポイント
    const app = new Hono();
    app.use('*', emfMetricsMiddleware);
    app.get('/success', (c) => c.json({ message: 'OK' }, 200));
    app.get('/client-error', (c) => c.json({ error: 'Bad Request' }, 400));
    app.get('/server-error', (c) =>
      c.json({ error: 'Internal Server Error' }, 500),
    );

    // When: 各エンドポイントにリクエスト
    await app.request('http://localhost/success', { method: 'GET' });
    await app.request('http://localhost/client-error', { method: 'GET' });
    await app.request('http://localhost/server-error', { method: 'GET' });

    // Then: すべてのレスポンスで5xxErrors/4xxErrorsメトリクスが宣言されている
    expect(consoleLogMock).toHaveBeenCalledTimes(3);

    for (let i = 0; i < 3; i++) {
      const loggedPayload = JSON.parse(consoleLogMock.mock.calls[i]?.[0]!);
      const metrics = loggedPayload._aws.CloudWatchMetrics[0].Metrics;

      // Metricsに5xxErrorsが常に宣言されている
      const has5xxErrorMetric = metrics.some(
        (m: { Name: string; Unit: string }) =>
          m.Name === '5xxErrors' && m.Unit === 'Count',
      );
      expect(has5xxErrorMetric).toBe(true);

      // Metricsに4xxErrorsが常に宣言されている
      const has4xxErrorMetric = metrics.some(
        (m: { Name: string; Unit: string }) =>
          m.Name === '4xxErrors' && m.Unit === 'Count',
      );
      expect(has4xxErrorMetric).toBe(true);

      // ペイロードに5xxErrorsフィールドが存在する
      expect(loggedPayload).toHaveProperty('5xxErrors');
      expect(typeof loggedPayload['5xxErrors']).toBe('number');
      expect([0, 1]).toContain(loggedPayload['5xxErrors']);

      // ペイロードに4xxErrorsフィールドが存在する
      expect(loggedPayload).toHaveProperty('4xxErrors');
      expect(typeof loggedPayload['4xxErrors']).toBe('number');
      expect([0, 1]).toContain(loggedPayload['4xxErrors']);
    }

    // Then: 200は5xxErrors=0/4xxErrors=0、400は5xxErrors=0/4xxErrors=1、500は5xxErrors=1/4xxErrors=0
    expect(JSON.parse(consoleLogMock.mock.calls[0]?.[0]!)['5xxErrors']).toBe(0);
    expect(JSON.parse(consoleLogMock.mock.calls[0]?.[0]!)['4xxErrors']).toBe(0);
    expect(JSON.parse(consoleLogMock.mock.calls[1]?.[0]!)['5xxErrors']).toBe(0);
    expect(JSON.parse(consoleLogMock.mock.calls[1]?.[0]!)['4xxErrors']).toBe(1);
    expect(JSON.parse(consoleLogMock.mock.calls[2]?.[0]!)['5xxErrors']).toBe(1);
    expect(JSON.parse(consoleLogMock.mock.calls[2]?.[0]!)['4xxErrors']).toBe(0);
  });
});
