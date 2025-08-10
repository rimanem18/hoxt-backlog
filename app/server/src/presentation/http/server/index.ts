import { Hono } from 'hono';
import hello from '../routes/helloRoutes';
import corsMiddleware from '../middleware/cors';

const app = new Hono();

app.use(
  '/api/*',
  corsMiddleware
);

app.route('/api', hello);
console.log(app.routes);

export default app;
