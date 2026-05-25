import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { StateResponse } from '../types/state.ts';

const app = new Hono();

app.get('/api/state', (c) => {
  const res: StateResponse = {
    kind: 'empty',
    empty: {
      variant: 'no-planning',
      projectPath: process.cwd(),
    },
  };
  return c.json(res);
});

const port = 7171;
serve({ fetch: app.fetch, port });
console.log(`vigil server listening on http://localhost:${port}`);
