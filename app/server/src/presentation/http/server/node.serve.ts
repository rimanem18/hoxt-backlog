import { serve } from '@hono/node-server';
import app from './index';

const port = Number(process.env.SERVER_PORT) || 3001;

console.log(`Server is running on port ${port} (Node.js runtime)`);

serve({
  fetch: app.fetch,
  port,
});
