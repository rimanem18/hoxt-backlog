import { Hono } from 'hono';

const app = new Hono();
Bun.serve({ fetch: app.fetch, port: Number(process.env.SERVER_PORT) || 3001 });

app.get('/', (c) => {
  return c.text('Hello Docker Hono!');
});

export default app;
