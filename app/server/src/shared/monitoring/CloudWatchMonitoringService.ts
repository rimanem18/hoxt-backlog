/**
 * CloudWatch Embedded Metric Format (EMF) による監視サービス実装
 *
 * MonitoringServiceインターフェースの具体実装。
 * CloudWatch Logsに構造化ログを出力し、自動的にカスタムメトリクスを生成する。
 *
 * セキュリティ考慮:
 * - リクエストボディ/ヘッダーは記録しない（メトリクスペイロードのみ）
 *
 * メトリクススキーマ一貫性（P0/P1教訓の適用）:
 * - 5xxErrors/4xxErrorsメトリクスは常に宣言し、値を0または1に設定
 * - Why: CloudWatch Metricsストリームの連続性を確保し、アラーム評価を正確にするため
 */
import type {
  HttpStatusMetrics,
  MonitoringService,
} from '@/shared/monitoring/MonitoringService';

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
  RequestId?: string;
  '5xxErrors': number;
  '4xxErrors': number;
}

/**
 * CloudWatch監視サービス
 *
 * Embedded Metric Format (EMF) を使用してCloudWatch Logsに出力する。
 * CloudWatchが自動的にログからメトリクスを抽出し、カスタムメトリクスを作成する。
 *
 * Why: 単一責任の原則（SRP）により、CloudWatch固有のメトリクス生成ロジックを
 * この実装クラスに集約し、Presentation層から分離する
 */
export class CloudWatchMonitoringService implements MonitoringService {
  /**
   * HTTPリクエストのステータスメトリクスを記録
   *
   * EMF形式でCloudWatch Logsに出力し、以下のメトリクスを生成：
   * - Latency: レイテンシ（ミリ秒）
   * - 5xxErrors: サーバーエラー数（常に宣言、値は0または1）
   * - 4xxErrors: クライアントエラー数（常に宣言、値は0または1）
   *
   * @param metrics - HTTPステータスメトリクス
   */
  recordHttpStatus(metrics: HttpStatusMetrics): void {
    const { status, path, method, latency, requestId } = metrics;

    // Embedded Metric Format仕様に準拠したペイロード
    // Why: 型定義により、EMF仕様準拠を静的に保証
    const emfPayload: EMFPayload = {
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            // Why: METRICS_NAMESPACEはTerraform変数で設定され、環境変数で注入される
            Namespace:
              process.env.METRICS_NAMESPACE || 'Application/Monitoring',
            Dimensions: [['Environment']],
            Metrics: [
              { Name: 'Latency', Unit: 'Milliseconds' },
              // Why: P0/P1教訓 - メトリクスは常に宣言（条件付き宣言はNG）
              { Name: '5xxErrors', Unit: 'Count' },
              { Name: '4xxErrors', Unit: 'Count' },
            ],
          },
        ],
      },
      // Why: ENVIRONMENTはLambda実行時環境変数として動的に読み込まれる
      // NODE_ENVはesbuildビルド時に静的置換されるため使用不可
      Environment: process.env.ENVIRONMENT || 'unknown',
      StatusCode: status,
      Path: path,
      Method: method,
      Latency: latency,
      ...(requestId && { RequestId: requestId }),
      // Why: 値で制御（常に0または1を出力）
      '5xxErrors': status >= 500 ? 1 : 0,
      '4xxErrors': status >= 400 && status < 500 ? 1 : 0,
    };

    // CloudWatch Logsへ出力（自動的にメトリクス化される）
    // センシティブデータ（リクエストボディ、ヘッダー）は含まない
    console.log(JSON.stringify(emfPayload));
  }

  /**
   * 例外発生を記録
   *
   * エラーログとして構造化情報をCloudWatch Logsに出力する。
   *
   * @param error - 発生した例外
   * @param context - 追加のコンテキスト情報
   */
  recordException(error: Error, context?: Record<string, unknown>): void {
    // Why: console.errorを使用してエラーレベルのログとして記録
    // CloudWatch Logsで自動的にERRORレベルとして分類される
    console.error('Exception occurred', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
}
