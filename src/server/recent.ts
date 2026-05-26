import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const MAX_RECENT = 8;

export interface RecentStoreOpts {
  // Override the config file location for tests. Defaults to
  // `$HOME/.config/vigil/recent.json` per D8.
  configFile?: string;
}

function defaultPath(): string {
  return join(homedir(), '.config', 'vigil', 'recent.json');
}

export class RecentStore {
  private readonly file: string;
  private cache: string[] | null = null;

  constructor(opts: RecentStoreOpts = {}) {
    this.file = opts.configFile ?? defaultPath();
  }

  list(): string[] {
    if (this.cache) return [...this.cache];
    this.cache = this.read();
    return [...this.cache];
  }

  add(path: string): void {
    const next = this.list().filter((p) => p !== path);
    next.unshift(path);
    if (next.length > MAX_RECENT) next.length = MAX_RECENT;
    this.cache = next;
    this.write(next);
  }

  remove(path: string): void {
    const current = this.list();
    const next = current.filter((p) => p !== path);
    if (next.length === current.length) return;
    this.cache = next;
    this.write(next);
  }

  private read(): string[] {
    let raw: string;
    try {
      raw = readFileSync(this.file, 'utf8');
    } catch {
      return [];
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!parsed || typeof parsed !== 'object') return [];
    const r = (parsed as { recent?: unknown }).recent;
    if (!Array.isArray(r)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of r) {
      if (typeof item !== 'string') continue;
      if (seen.has(item)) continue;
      seen.add(item);
      out.push(item);
      if (out.length >= MAX_RECENT) break;
    }
    return out;
  }

  private write(list: string[]): void {
    // D8 hard constraint: the file contains EXACTLY one top-level key.
    const payload: { recent: string[] } = { recent: list };
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  }
}
