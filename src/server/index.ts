#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { StateResponse } from '../types/state.ts';
import { validateTemplate } from '../parsers/openInEditor.js';
import { findPlanningDir, type DiscoveryResult } from './discover.js';
import { assembleState } from './assemble.js';
import { createWatcher } from './watcher.js';
import { SSEBroadcaster } from './sse.js';
import { RecentStore } from './recent.js';

const explicit = process.argv[2];

const rawOpenUrl = process.env.VIGIL_OPEN_URL;
const validated = validateTemplate(rawOpenUrl);
if (!validated.ok) {
  console.warn(
    `vigil: VIGIL_OPEN_URL=${JSON.stringify(rawOpenUrl)} ignored — ${validated.reason}. ` +
    `Falling back to default vscode://file/%s.`,
  );
}
// Only forward a template to the client when it differs from the default;
// the client's openInEditor() applies the default on its own.
const openUrlTemplate = validated.ok && rawOpenUrl ? validated.template : undefined;

const app = new Hono();
const broadcaster = new SSEBroadcaster();
const recent = new RecentStore();

// Mutable session state: switching projects swaps these out.
let discovery: DiscoveryResult = findPlanningDir(process.cwd(), explicit);
let closeWatcher: (() => void) | null = null;

function syncRecentForDiscovery(requested: string | undefined, result: DiscoveryResult): void {
  if (result.kind === 'found') {
    recent.add(result.projectPath);
  } else if (requested) {
    // The user-supplied path didn't yield a usable .planning/ — drop it
    // from recent if it was there (per issue #8 failure rule).
    recent.remove(requested);
  }
}

function openWatcherFor(result: DiscoveryResult): void {
  if (closeWatcher) {
    closeWatcher();
    closeWatcher = null;
  }
  if (result.kind === 'found') {
    closeWatcher = createWatcher(result.planningDir, () => {
      broadcaster.broadcast();
    });
  }
}

syncRecentForDiscovery(explicit, discovery);
openWatcherFor(discovery);

app.get('/api/state', (c) => {
  let res: StateResponse;
  if (discovery.kind === 'missing') {
    res = {
      kind: 'empty',
      empty: { variant: 'no-planning', projectPath: discovery.searchedFrom },
    };
  } else {
    res = assembleState(discovery.planningDir, discovery.projectPath, openUrlTemplate);
  }
  return c.json(res);
});

app.get('/api/recent', (c) => {
  const current = discovery.kind === 'found' ? discovery.projectPath : null;
  return c.json({ recent: recent.list(), current });
});

app.post('/api/switch', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON' }, 400);
  }
  const path = (body && typeof body === 'object' && typeof (body as { path?: unknown }).path === 'string')
    ? (body as { path: string }).path
    : null;
  if (!path) return c.json({ error: 'missing path' }, 400);

  const next = findPlanningDir(path, path);
  discovery = next;
  syncRecentForDiscovery(path, next);
  openWatcherFor(next);
  broadcaster.broadcast();
  return c.json({ ok: true, kind: next.kind });
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

// Serve the built SPA. Catch-all sits AFTER /api/* and /events so those win.
// In dev (tsx watch) the dist/client bundle doesn't exist — Vite serves the
// client on :5173 and proxies /api here, so this branch is unused there.
const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../client');
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.map':  'application/json',
};

app.get('*', async (c) => {
  const pathname = new URL(c.req.url).pathname;
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const absolute = resolve(clientRoot, rel);
  if (absolute !== clientRoot && !absolute.startsWith(clientRoot + sep)) {
    return c.text('forbidden', 403);
  }
  try {
    const body = await readFile(absolute);
    const type = MIME[extname(absolute)] ?? 'application/octet-stream';
    return c.body(body, 200, { 'content-type': type });
  } catch {
    try {
      const html = await readFile(resolve(clientRoot, 'index.html'));
      return c.body(html, 200, { 'content-type': 'text/html; charset=utf-8' });
    } catch {
      return c.text('client bundle missing — run `npm run build`', 500);
    }
  }
});

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
