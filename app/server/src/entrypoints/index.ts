import { Hono } from 'hono';
import { errorHandlerMiddleware } from '@/presentation/http/middleware';
import corsMiddleware from '@/presentation/http/middleware/corsMiddleware';
import { auth, greet, health, user } from '@/presentation/http/routes';

/**
 * Hono アプリケーションサーバーを作成する（設計仕様準拠）
 * エラーハンドリング・CORS・認証ミドルウェアとルートを設定して返却する
 */
const createServer = (): Hono => {
  const app = new Hono();

  // 【エラーハンドリング】: 全APIルートに統一エラーレスポンス適用
  app.use('/api/*', errorHandlerMiddleware);

  // 【CORS】: ミドルウェアを API ルートに適用
  app.use('/api/*', corsMiddleware);

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
