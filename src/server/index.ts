import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { StateResponse } from '../types/state.ts';
import { findPlanningDir } from './discover.js';
import { assembleState } from './assemble.js';

const explicit = process.argv[2];
const discovery = findPlanningDir(process.cwd(), explicit);

const app = new Hono();

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

const port = 7171;
serve({ fetch: app.fetch, port });
if (discovery.kind === 'found') {
  console.log(`vigil watching ${discovery.planningDir}`);
} else {
  console.log(`vigil: no .planning/ found from ${discovery.searchedFrom}`);
}
console.log(`vigil server listening on http://localhost:${port}`);
