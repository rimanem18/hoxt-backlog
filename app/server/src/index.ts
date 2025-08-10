import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
Bun.serve({ fetch: app.fetch, port: Number(process.env.SERVER_PORT) || 3001 });

app.use(
  '/api/*',
  cors({
    origin: '*',
    allowHeaders: ['*'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['*'],
  }),
);

app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello, Hono + Next.js on Docker!' });
});

export default app;
