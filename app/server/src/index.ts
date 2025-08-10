import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// カンマ区切りの文字列を配列に変換するヘルパー関数
const parseCommaSeparated = (value: string | undefined): string[] => {
  return value ? value.split(',').map((item) => item.trim()) : [];
};

app.use(
  '/api/*',
  cors({
    origin: parseCommaSeparated(process.env.ACCESS_ALLOW_ORIGIN),
    allowMethods: parseCommaSeparated(process.env.ACCESS_ALLOW_METHODS),
    allowHeaders: parseCommaSeparated(process.env.ACCESS_ALLOW_HEADERS),
    maxAge: 600,
  }),
);

app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello, Hono + Next.js on Docker!' });
});


export default app;
