import { Hono } from 'hono';

/**
 * Health API のルート定義
 * プレゼンテーション層として、HTTPリクエストをユースケースに委譲する
 */
const health = new Hono();

// ヘルスチェックエンドポイント
// ステータスコードを 200 で明示
health.get('/health', (c) => {
  return c.json({ status: 'ok' }, 200);
});

export default health;
