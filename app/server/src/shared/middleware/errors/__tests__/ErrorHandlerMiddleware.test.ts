/**
 * createErrorHandler のテストケース集
 *
 * MonitoringServiceへのException Flow連携を検証する
 *
 * Why: Hono 4.xではapp.onErrorハンドラーを使用するため、
 * ミドルウェア形式ではなくonError形式でテスト
 */

import { describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import type { MonitoringService } from '@/shared/monitoring/MonitoringService';
import { AuthError } from '../AuthError';
import { createErrorHandler } from '../ErrorHandlerMiddleware';

describe('createErrorHandler', () => {
  describe('MonitoringService連携', () => {
    test('AuthError発生時にrecordExceptionが呼ばれる', async () => {
      // Given: モックMonitoringService
      const mockMonitoring: MonitoringService = {
        recordHttpStatus: mock(() => {}),
        recordException: mock(() => {}),
      };

      // Given: AuthErrorをスローするエンドポイント
      const app = new Hono();
      app.onError(createErrorHandler(mockMonitoring));
      app.get('/test', () => {
        // Why: AuthErrorのコンストラクタは(code, status, message)の順序
        throw new AuthError(
          'AUTHENTICATION_REQUIRED',
          401,
          'ログインが必要です',
        );
      });

      // When: リクエストを実行
      const response = await app.request('http://localhost/test', {
        method: 'GET',
      });

      // Then: 401レスポンスが返る
      expect(response.status).toBe(401);

      // Then: recordExceptionが1回呼ばれる
      expect(mockMonitoring.recordException).toHaveBeenCalledTimes(1);

      // Then: AuthErrorとコンテキストが渡される
      const call = (mockMonitoring.recordException as ReturnType<typeof mock>)
        .mock.calls[0];
      const error = call?.[0];
      const context = call?.[1];

      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe('AUTHENTICATION_REQUIRED');
      expect(context).toHaveProperty('code', 'AUTHENTICATION_REQUIRED');
      expect(context).toHaveProperty('status', 401);
    });

    test('予期外エラー発生時にrecordExceptionが呼ばれる', async () => {
      // Given: モックMonitoringService
      const mockMonitoring: MonitoringService = {
        recordHttpStatus: mock(() => {}),
        recordException: mock(() => {}),
      };

      // Given: 予期外エラーをスローするエンドポイント
      const app = new Hono();
      app.onError(createErrorHandler(mockMonitoring));
      app.get('/test', () => {
        throw new Error('Unexpected error');
      });

      // When: リクエストを実行
      const response = await app.request('http://localhost/test', {
        method: 'GET',
      });

      // Then: 500レスポンスが返る
      expect(response.status).toBe(500);

      // Then: recordExceptionが1回呼ばれる
      expect(mockMonitoring.recordException).toHaveBeenCalledTimes(1);

      // Then: エラーとコンテキストが渡される
      const call = (mockMonitoring.recordException as ReturnType<typeof mock>)
        .mock.calls[0];
      const error = call?.[0];
      const context = call?.[1];

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('Unexpected error');
      expect(context).toHaveProperty('type', 'INTERNAL_SERVER_ERROR');
    });

    test('エラーなし時にrecordExceptionは呼ばれない', async () => {
      // Given: モックMonitoringService
      const mockMonitoring: MonitoringService = {
        recordHttpStatus: mock(() => {}),
        recordException: mock(() => {}),
      };

      // Given: 正常なエンドポイント
      const app = new Hono();
      app.onError(createErrorHandler(mockMonitoring));
      app.get('/test', (c) => c.json({ message: 'OK' }, 200));

      // When: リクエストを実行
      const response = await app.request('http://localhost/test', {
        method: 'GET',
      });

      // Then: 200レスポンスが返る
      expect(response.status).toBe(200);

      // Then: recordExceptionは呼ばれない
      expect(mockMonitoring.recordException).toHaveBeenCalledTimes(0);
    });
  });
});
