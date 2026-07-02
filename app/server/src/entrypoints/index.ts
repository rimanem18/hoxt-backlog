import { OpenAPIHono } from '@hono/zod-openapi';
import greet from '@/greet/presentation/greetRoutes';
import health from '@/health/presentation/healthRoutes';
import { validateEnv } from '@/shared/config/env';
import docs from '@/shared/docs/docsRoutes';
import corsMiddleware from '@/shared/middleware/corsMiddleware';
import { createErrorHandler } from '@/shared/middleware/errors/ErrorHandlerMiddleware';
import { metricsMiddleware } from '@/shared/middleware/metricsMiddleware';
import { CloudWatchMonitoringService } from '@/shared/monitoring/CloudWatchMonitoringService';
import task from '@/task/presentation/taskRoutes';
import auth from '@/user/presentation/authRoutes';
import emailSignup from '@/user/presentation/emailSignupRoutes';
import user from '@/user/presentation/userRoutes';

/**
 * OpenAPIHono アプリケーションサーバーを作成する
 *
 * DDD/Clean Architecture原則に従い、依存性注入パターンを使用。
 * 監視サービスの具象実装（CloudWatchMonitoringService）をここで注入する。
 *
 * Why: OpenAPIHonoを使用することでOpenAPI仕様の自動生成が可能になる
 * Why: 依存性注入により、テスト時にはモックMonitoringServiceを注入でき、
 * 本番環境ではCloudWatch実装を注入できる（リスコフの置換原則）
 */
const createServer = (): OpenAPIHono => {
  // 環境変数検証（Supabase初期化前に実行）
  // Why: 起動時に環境変数の不足を早期検出し、明確なエラーメッセージを提供
  if (process.env.NODE_ENV !== 'test') {
    validateEnv();
  }

  const app = new OpenAPIHono();

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
  app.route('/api', emailSignup);
  app.route('/api', user);
  app.route('/api', task);
  app.route('/api', docs);

  return app;
};

// アプリケーションインスタンスを作成してエクスポート
const app = createServer();

export default app;
