import app from './index';

Bun.serve({ fetch: app.fetch, port: Number(process.env.SERVER_PORT) || 3001 });
