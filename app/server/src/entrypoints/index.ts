import { Hono } from 'hono';
import { CloudWatchMonitoringService } from '@/infrastructure/monitoring/CloudWatchMonitoringService';
import { createErrorHandler } from '@/presentation/http/middleware';
import corsMiddleware from '@/presentation/http/middleware/corsMiddleware';
import { metricsMiddleware } from '@/presentation/http/middleware/metricsMiddleware';
import { auth, greet, health, user } from '@/presentation/http/routes';

/**
 * Hono アプリケーションサーバーを作成する
 *
 * DDD/Clean Architecture原則に従い、依存性注入パターンを使用。
 * 監視サービスの具象実装（CloudWatchMonitoringService）をここで注入する。
 *
 * Why: 依存性注入により、テスト時にはモックMonitoringServiceを注入でき、
 * 本番環境ではCloudWatch実装を注入できる（リスコフの置換原則）
 */
const createServer = (): Hono => {
  const app = new Hono();

  // 依存性注入: CloudWatch監視サービスをインスタンス化
  // Why: アプリケーション起動時に1回だけインスタンス化（リクエストごとではない）
  const monitoring = new CloudWatchMonitoringService();

  // 【CORS】: ミドルウェアを API ルートに適用（エラーレスポンスにもCORSヘッダーが必要なため最初に配置）
  app.use('/api/*', corsMiddleware);

  // 【メトリクス記録】: HTTPステータスコードとレイテンシを記録
  // Why: try/finallyパターンでエラー発生時もメトリクス記録を保証
  app.use('/api/*', metricsMiddleware(monitoring));

  // 【エラーハンドリング】: 全エラーを統一レスポンスに変換
  // Why: Hono 4.xの仕様により、app.onErrorでエラーハンドリング
  // 依存性注入により、MonitoringServiceを介してエラーログを記録
  app.onError(createErrorHandler(monitoring));

  // API ルートをマウント
  app.route('/api', greet);
  app.route('/api', health);
  app.route('/api', auth);
  app.route('/api', user);

  return app;
};

// アプリケーションインスタンスを作成してエクスポート
const app = createServer();

export default app;
