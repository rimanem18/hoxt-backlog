import { Hono } from "hono";
const hello = new Hono();

hello.get('/hello', (c) => {
  return c.json({ message: 'Hello, Hono + Next.js on Docker!' });
});

export default hello;
