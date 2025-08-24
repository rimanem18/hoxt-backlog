import { Hono } from 'hono';
import corsMiddleware from '../middleware/corsMiddleware';
import { greet, health, auth } from '../routes';

/**
 * Hono アプリケーションサーバーを作成する
 * ミドルウェアとルートを設定して返却する
 */
const createServer = (): Hono => {
  const app = new Hono();

  // CORS ミドルウェアを API ルートに適用
  app.use('/api/*', corsMiddleware);

  // API ルートをマウント
  app.route('/api', greet);
  app.route('/api', health);
  app.route('/api', auth);

  return app;
};

// アプリケーションインスタンスを作成してエクスポート
const app = createServer();

export default app;
