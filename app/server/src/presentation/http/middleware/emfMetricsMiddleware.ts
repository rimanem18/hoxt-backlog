/**
 * Embedded Metric Format (EMF) によるHTTPメトリクス記録ミドルウェア
 *
 * CloudWatch Logsに構造化ログを出力し、自動的にカスタムメトリクスを生成する。
 * 5xxエラー（P0）と4xxエラー（P1）をメトリクス化する。
 *
 * セキュリティ考慮:
 * - リクエストボディ/ヘッダーは記録しない（メトリクスペイロードのみ）
 *
 * 配置順序:
 * - errorHandlerMiddlewareの前に配置する必要がある
 * - Why: try/finallyパターンで下流のエラーハンドリング後の最終ステータスコードを捕捉するため
 *
 * メトリクススキーマ一貫性:
 * - 5xxErrors/4xxErrorsメトリクスは常に宣言し、値を0または1に設定
 * - Why: CloudWatch Metricsストリームの連続性を確保し、アラーム評価を正確にするため
 */
import { createMiddleware } from 'hono/factory';

/**
 * EMFメトリクス定義
 */
interface EMFMetric {
  Name: string;
  Unit: string;
}

/**
 * EMFペイロード型定義
 *
 * CloudWatch Embedded Metric Format仕様に準拠
 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html
 */
interface EMFPayload {
  _aws: {
    Timestamp: number;
    CloudWatchMetrics: Array<{
      Namespace: string;
      Dimensions: string[][];
      Metrics: EMFMetric[];
    }>;
  };
  Environment: string;
  StatusCode: number;
  Path: string;
  Method: string;
  Latency: number;
  '5xxErrors': number;
  '4xxErrors': number;
}

/**
 * EMFミドルウェア
 *
 * 全HTTPリクエストのレスポンス情報をCloudWatch Metricsに記録する
 * エラー発生時もメトリクス出力を保証するため、try/finally構文を使用
 */
export const emfMetricsMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();

  try {
    // 下流ミドルウェア・ハンドラーを実行
    await next();
  } finally {
    // エラー発生時もメトリクス出力を保証
    const statusCode = c.res.status;
    const latency = Date.now() - start;

    // Embedded Metric Format仕様に準拠したペイロード
    // Why: 型定義により、EMF仕様準拠を静的に保証
    const emfPayload: EMFPayload = {
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace:
              process.env.METRICS_NAMESPACE || 'Application/Monitoring',
            Dimensions: [['Environment']],
            Metrics: [
              { Name: 'Latency', Unit: 'Milliseconds' },
              { Name: '5xxErrors', Unit: 'Count' },
              { Name: '4xxErrors', Unit: 'Count' },
            ],
          },
        ],
      },
      Environment: process.env.ENVIRONMENT || 'unknown',
      StatusCode: statusCode,
      Path: c.req.path,
      Method: c.req.method,
      Latency: latency,
      '5xxErrors': statusCode >= 500 ? 1 : 0,
      '4xxErrors': statusCode >= 400 && statusCode < 500 ? 1 : 0,
    };

    // CloudWatch Logsへ出力（自動的にメトリクス化される）
    // センシティブデータ（リクエストボディ、ヘッダー）は含まない
    console.log(JSON.stringify(emfPayload));
  }
});
