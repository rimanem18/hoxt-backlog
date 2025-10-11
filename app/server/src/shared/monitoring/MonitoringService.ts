/**
 * 監視サービスの抽象インターフェース
 *
 * DDD/Clean Architecture原則に従い、監視の抽象概念をShared層で定義する。
 * 具体的な監視基盤（CloudWatch、Datadog等）はInfrastructure層で実装。
 *
 * Why: 依存性逆転の原則（DIP）により、上位層（Presentation）は抽象に依存し、
 * 下位層（Infrastructure）の実装詳細から独立する
 */

/**
 * HTTPステータスメトリクス
 *
 * プロバイダー非依存の抽象型（CloudWatch固有の詳細は含めない）
 */
export interface HttpStatusMetrics {
  /** HTTPステータスコード */
  status: number;
  /** リクエストパス */
  path: string;
  /** HTTPメソッド */
  method: string;
  /** レイテンシ（ミリ秒） */
  latency: number;
  /** リクエストID（オプション） */
  requestId?: string;
}

/**
 * 監視サービスインターフェース
 *
 * アプリケーション全体の監視機能を抽象化する。
 * Infrastructure層で具体的な監視基盤（CloudWatch等）を実装する。
 *
 * Why: インターフェース分離の原則（ISP）により、最小限のメソッドのみを定義し、
 * 利用側が不要なメソッドに依存しないようにする
 */
export interface MonitoringService {
  /**
   * HTTPリクエストのステータスメトリクスを記録
   *
   * @param metrics - HTTPステータスメトリクス
   */
  recordHttpStatus(metrics: HttpStatusMetrics): void;

  /**
   * 例外発生を記録
   *
   * @param error - 発生した例外
   * @param context - 追加のコンテキスト情報
   */
  recordException(error: Error, context?: Record<string, unknown>): void;
}
