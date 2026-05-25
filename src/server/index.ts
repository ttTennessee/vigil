import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { StateResponse } from '../types/state.ts';
import { findPlanningDir } from './discover.js';
import { assembleState } from './assemble.js';
import { createWatcher } from './watcher.js';
import { SSEBroadcaster } from './sse.js';

const explicit = process.argv[2];
const discovery = findPlanningDir(process.cwd(), explicit);

const app = new Hono();
const broadcaster = new SSEBroadcaster();

app.get('/api/state', (c) => {
  let res: StateResponse;
  if (discovery.kind === 'missing') {
    res = {
      kind: 'empty',
      empty: { variant: 'no-planning', projectPath: discovery.searchedFrom },
    };
  } else {
    res = assembleState(discovery.planningDir, discovery.projectPath);
  }
  return c.json(res);
});

app.get('/api/artifact', async (c) => {
  if (discovery.kind === 'missing') return c.text('no .planning/', 404);
  const requested = c.req.query('path');
  if (!requested) return c.text('missing path', 400);

  const root = discovery.planningDir;
  const absolute = resolve(root, requested);
  if (absolute !== root && !absolute.startsWith(root + sep)) {
    return c.text('forbidden', 403);
  }
  try {
    const body = await readFile(absolute, 'utf8');
    return c.body(body, 200, { 'content-type': 'text/markdown; charset=utf-8' });
  } catch {
    return c.text('not found', 404);
  }
});

app.get('/events', (c) =>
  streamSSE(c, async (stream) => {
    broadcaster.add(stream);
    await stream.writeSSE({ event: 'ready', data: '{}' });
    await new Promise<void>((resolve) => {
      stream.onAbort(() => resolve());
    });
    broadcaster.remove(stream);
  }),
);

let closeWatcher: (() => void) | null = null;
if (discovery.kind === 'found') {
  closeWatcher = createWatcher(discovery.planningDir, () => {
    broadcaster.broadcast();
  });
}

const port = 7171;
serve({ fetch: app.fetch, port });
if (discovery.kind === 'found') {
  console.log(`vigil watching ${discovery.planningDir}`);
} else {
  console.log(`vigil: no .planning/ found from ${discovery.searchedFrom}`);
}
console.log(`vigil server listening on http://localhost:${port}`);

const shutdown = () => {
  if (closeWatcher) closeWatcher();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
