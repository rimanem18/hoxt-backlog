import { Hono } from 'hono';
import corsMiddleware from '../middleware/corsMiddleware';
import { errorHandlerMiddleware } from '../middleware';
import { auth, greet, health, user } from '../routes';

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
