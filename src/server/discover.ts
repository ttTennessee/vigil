import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';

export type DiscoveryResult =
  | { kind: 'found'; planningDir: string; projectPath: string }
  | { kind: 'missing'; searchedFrom: string };

function planningAt(dir: string): string | null {
  const p = resolve(dir, '.planning');
  if (existsSync(p) && statSync(p).isDirectory()) return p;
  return null;
}

export function findPlanningDir(cwd: string, explicit?: string): DiscoveryResult {
  if (explicit) {
    const abs = isAbsolute(explicit) ? explicit : resolve(cwd, explicit);
    const p = planningAt(abs);
    if (p) return { kind: 'found', planningDir: p, projectPath: abs };
    return { kind: 'missing', searchedFrom: abs };
  }

  const ceiling = homedir();
  let cur = resolve(cwd);
  while (true) {
    const p = planningAt(cur);
    if (p) return { kind: 'found', planningDir: p, projectPath: cur };
    if (cur === ceiling) break;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return { kind: 'missing', searchedFrom: cwd };
}
