import { Hono } from 'hono';
import corsMiddleware from '../middleware/cors';
import hello from '../routes/helloRoutes';

/**
 * Hono アプリケーションサーバーを作成する
 * ミドルウェアとルートを設定して返却する
 */
const createServer = (): Hono => {
  const app = new Hono();

  // CORS ミドルウェアを API ルートに適用
  app.use('/api/*', corsMiddleware);

  // API ルートをマウント
  app.route('/api', hello);

  return app;
};

// アプリケーションインスタンスを作成してエクスポート
const app = createServer();

export default app;
