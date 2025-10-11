/**
 * 【機能概要】: 統一エラーハンドリング（設計仕様準拠）
 * 【実装方針】: AuthErrorを適切なHTTPレスポンスに変換
 * 【テスト対応】: エラーレスポンス形式の統合テスト可能
 * 🟢 信頼性レベル: api-endpoints.md統一レスポンス仕様準拠
 *
 * Why: DDD/Clean Architecture原則に従い、MonitoringServiceインターフェースに依存。
 * 例外発生時にモニタリング基盤（CloudWatch等）へ記録する。
 *
 * Why: Hono 4.xの仕様によりapp.onErrorハンドラーとして実装
 * ミドルウェアのtry/catchではエラーをキャッチできないため、onErrorを使用する
 */

import type { ErrorHandler } from 'hono';
import type { ErrorResponse } from '@/packages/shared-schemas/src/api';
import type { MonitoringService } from '@/shared/monitoring/MonitoringService';
import { AuthError } from './AuthError';

/**
 * 【エラーハンドラー】: AuthError等をHTTPレスポンスに変換
 * AuthMiddlewareから送出されたAuthErrorを適切なHTTPレスポンスに変換
 *
 * 依存性注入パターンを使用し、MonitoringServiceインターフェースに依存する。
 * 具体的な監視基盤（CloudWatch、Datadog等）は実行時に注入される。
 *
 * Why: app.onErrorで使用するため、ErrorHandler型を返す
 *
 * @param monitoring - 監視サービスインスタンス
 * @returns Hono ErrorHandler関数
 */
export const createErrorHandler = (
  monitoring: MonitoringService,
): ErrorHandler => {
  return (error, c) => {
    // 【認証エラー】: AuthErrorの場合は統一エラーレスポンス生成
    if (error instanceof AuthError) {
      // Why: AuthErrorもモニタリング対象（セキュリティ監査のため）
      monitoring.recordException(error, {
        code: error.code,
        status: error.status,
      });

      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: error.code, // AUTHENTICATION_REQUIRED
          message: error.message, // 'ログインが必要です'
        },
      };

      return c.json(errorResponse, error.status as 401);
    }

    // 【予期外エラー】: その他のエラーは内部サーバーエラーとして処理
    // Why: 予期外エラーは重大な問題の兆候のため、モニタリング必須
    if (error instanceof Error) {
      monitoring.recordException(error, {
        type: 'INTERNAL_SERVER_ERROR',
      });
    }

    const internalErrorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '一時的にサービスが利用できません',
      },
    };

    return c.json(internalErrorResponse, 500);
  };
};
