/**
 * HTTPメトリクス記録ミドルウェア
 *
 * 全HTTPリクエストのレスポンス情報をMonitoringServiceに記録する。
 * MonitoringServiceの具象実装（CloudWatch等）には依存しない。
 *
 * Why: 依存性逆転の原則（DIP）により、Presentation層はインターフェースに依存し、
 * Infrastructure層の実装詳細（CloudWatch固有のロジック）から独立する
 *
 * 配置順序:
 * - errorHandlerMiddlewareの前に配置する必要がある
 * - Why: try/finallyパターンで下流のエラーハンドリング後の最終ステータスコードを捕捉するため
 */
import { createMiddleware } from 'hono/factory';
import type { MonitoringService } from '@/shared/monitoring/MonitoringService';

/**
 * メトリクスミドルウェア
 *
 * 依存性注入パターンを使用し、MonitoringServiceインターフェースに依存する。
 * 具体的な監視基盤（CloudWatch、Datadog等）は実行時に注入される。
 *
 * Why: 開放閉鎖の原則（OCP）により、新しい監視基盤の追加時に
 * このミドルウェアコードを変更せずに済む
 *
 * @param monitoring - 監視サービスインスタンス
 * @returns Honoミドルウェア関数
 */
export const metricsMiddleware = (monitoring: MonitoringService) =>
  createMiddleware(async (c, next) => {
    const start = Date.now();

    try {
      // 下流ミドルウェア・ハンドラーを実行
      await next();
    } finally {
      // エラー発生時もメトリクス出力を保証
      // Why: finallyブロックは例外発生時も必ず実行されるため、
      // すべてのリクエストでメトリクスを記録できる
      // リクエストIDを取得（存在する場合のみ設定）
      const requestId = c.req.header('x-request-id');

      monitoring.recordHttpStatus({
        status: c.res.status,
        path: c.req.path,
        method: c.req.method,
        latency: Date.now() - start,
        // Why: 分散トレーシングのためにリクエストIDを記録
        // CloudWatch Logsで異なるログエントリを関連付けるために使用
        ...(requestId && { requestId }),
      });
    }
  });
