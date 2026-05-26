import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RecentStore } from '../../src/server/recent.js';

describe('RecentStore', () => {
  let dir: string;
  let file: string;
  let store: RecentStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vigil-recent-'));
    file = join(dir, 'recent.json');
    store = new RecentStore({ configFile: file });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const readJson = () => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

  it('starts empty when no file exists', () => {
    expect(store.list()).toEqual([]);
  });

  it('prepends, dedupes, and trims to 8 (issue #8 acceptance)', () => {
    store.add('/p/a');
    store.add('/p/b');
    store.add('/p/c');
    expect(store.list()).toEqual(['/p/c', '/p/b', '/p/a']);

    // Re-adding moves to front without dup.
    store.add('/p/a');
    expect(store.list()).toEqual(['/p/a', '/p/c', '/p/b']);

    // Trim to 8.
    for (let i = 0; i < 10; i++) store.add(`/p/x${i}`);
    const list = store.list();
    expect(list.length).toBe(8);
    expect(list[0]).toBe('/p/x9');
  });

  it('drops a path from recent on remove()', () => {
    store.add('/p/a');
    store.add('/p/b');
    store.remove('/p/a');
    expect(store.list()).toEqual(['/p/b']);
  });

  it('D8 hard constraint: recent.json only ever has the "recent" key', () => {
    store.add('/p/a');
    store.add('/p/b');
    const json = readJson();
    expect(Object.keys(json).sort()).toEqual(['recent']);
    expect(json.recent).toEqual(['/p/b', '/p/a']);
  });

  it('survives a process restart (re-reads file)', () => {
    store.add('/p/a');
    store.add('/p/b');
    const fresh = new RecentStore({ configFile: file });
    expect(fresh.list()).toEqual(['/p/b', '/p/a']);
  });

  it('ignores extra keys in an existing file and rewrites cleanly', () => {
    // Even if some other tool wrote extras, our next write must purge them.
    writeFileSync(file, JSON.stringify({ recent: ['/p/a'], theme: 'dark', stale: 42 }), 'utf8');
    const s2 = new RecentStore({ configFile: file });
    expect(s2.list()).toEqual(['/p/a']);
    s2.add('/p/b');
    const json = readJson();
    expect(Object.keys(json).sort()).toEqual(['recent']);
  });

  it('treats malformed JSON as empty', () => {
    writeFileSync(file, 'not json', 'utf8');
    const s2 = new RecentStore({ configFile: file });
    expect(s2.list()).toEqual([]);
  });

  it('filters non-string entries', () => {
    writeFileSync(file, JSON.stringify({ recent: ['/p/a', 5, null, '/p/b'] }), 'utf8');
    const s2 = new RecentStore({ configFile: file });
    expect(s2.list()).toEqual(['/p/a', '/p/b']);
  });
});
