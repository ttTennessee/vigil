import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findPlanningDir } from '../../src/server/discover.js';

describe('findPlanningDir', () => {
  let root: string;
  let home: string;

  beforeEach(() => {
    // root acts as a fake filesystem root; `home` inside it is the walk ceiling.
    root = mkdtempSync(join(tmpdir(), 'vigil-discover-'));
    home = join(root, 'home', 'tester');
    mkdirSync(home, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns found when an explicit path contains .planning/', () => {
    const project = join(home, 'project');
    mkdirSync(join(project, '.planning'), { recursive: true });
    const res = findPlanningDir(home, project, { homeDir: home });
    expect(res).toEqual({
      kind: 'found',
      planningDir: join(project, '.planning'),
      projectPath: project,
    });
  });

  it('returns missing when an explicit path has no .planning/', () => {
    const empty = join(home, 'no-planning');
    mkdirSync(empty, { recursive: true });
    const res = findPlanningDir(home, empty, { homeDir: home });
    expect(res).toEqual({ kind: 'missing', searchedFrom: empty });
  });

  it('walks up from a sub-directory until it finds .planning/', () => {
    const project = join(home, 'project');
    const sub = join(project, 'src', 'deep', 'nested');
    mkdirSync(sub, { recursive: true });
    mkdirSync(join(project, '.planning'), { recursive: true });
    const res = findPlanningDir(sub, undefined, { homeDir: home });
    expect(res).toEqual({
      kind: 'found',
      planningDir: join(project, '.planning'),
      projectPath: project,
    });
  });

  it('returns missing when cwd is $HOME itself and $HOME has no .planning/', () => {
    const res = findPlanningDir(home, undefined, { homeDir: home });
    expect(res.kind).toBe('missing');
  });

  it('never walks past $HOME — does not pick up a .planning/ above the ceiling', () => {
    const above = join(root, 'above-home');
    mkdirSync(join(above, '.planning'), { recursive: true });
    const project = join(home, 'project');
    mkdirSync(project, { recursive: true });
    const res = findPlanningDir(project, undefined, { homeDir: home });
    expect(res.kind).toBe('missing');
  });
});
