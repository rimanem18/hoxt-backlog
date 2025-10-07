import { Hono } from 'hono';
import { errorHandlerMiddleware } from '@/presentation/http/middleware';
import corsMiddleware from '@/presentation/http/middleware/corsMiddleware';
import { emfMetricsMiddleware } from '@/presentation/http/middleware/emfMetricsMiddleware';
import { auth, greet, health, user } from '@/presentation/http/routes';

/**
 * Hono アプリケーションサーバーを作成する（設計仕様準拠）
 * エラーハンドリング・CORS・メトリクス記録ミドルウェアとルートを設定して返却する
 */
const createServer = (): Hono => {
  const app = new Hono();

  // 【CORS】: ミドルウェアを API ルートに適用（エラーレスポンスにもCORSヘッダーが必要なため最初に配置）
  app.use('/api/*', corsMiddleware);

  // 【メトリクス記録】: HTTPステータスコードとレイテンシを記録
  // Why: try/finallyパターンで下流のエラーハンドリング後のレスポンスを捕捉するため、errorHandlerMiddlewareより前に配置
  app.use('/api/*', emfMetricsMiddleware);

  // 【エラーハンドリング】: 全APIルートに統一エラーレスポンス適用
  app.use('/api/*', errorHandlerMiddleware);

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
