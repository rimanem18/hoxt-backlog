import { cors } from 'hono/cors';
import { parseCommaSeparated } from '@/shared/array';

export const corsMiddleware = cors({
  origin: parseCommaSeparated(process.env.ACCESS_ALLOW_ORIGIN),
  allowMethods: parseCommaSeparated(process.env.ACCESS_ALLOW_METHODS),
  allowHeaders: parseCommaSeparated(process.env.ACCESS_ALLOW_HEADERS),
  maxAge: 600,
});

export default corsMiddleware;
