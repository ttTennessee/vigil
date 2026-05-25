import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assembleState } from '../../src/server/assemble.js';

describe('assembleState — empty / partial variants', () => {
  let root: string;
  let planning: string;
  const projectPath = '/fake/project';

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'vigil-assemble-'));
    planning = join(root, '.planning');
    mkdirSync(planning, { recursive: true });
  });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('returns newborn-planning when phases/ is empty or missing, with root-file evidence', () => {
    writeFileSync(join(planning, 'PROJECT.md'), '# project');
    writeFileSync(join(planning, 'REQUIREMENTS.md'), '# reqs');
    // No phases/, no ROADMAP, no STATE.

    const res = assembleState(planning, projectPath);
    expect(res.kind).toBe('empty');
    if (res.kind !== 'empty') return;
    expect(res.empty.variant).toBe('newborn-planning');
    expect(res.empty.projectPath).toBe(projectPath);

    const ev = Object.fromEntries((res.empty.evidence ?? []).map((e) => [e.name, e.present]));
    expect(ev['PROJECT.md']).toBe(true);
    expect(ev['REQUIREMENTS.md']).toBe(true);
    expect(ev['ROADMAP.md']).toBe(false);
    expect(ev['STATE.md']).toBe(false);
    expect(ev['phases/']).toBe(false);
  });

  it('returns kind:state with a "no STATE.md" warning when phases exist but STATE.md is missing', () => {
    const phaseDir = join(planning, 'phases', '04-thing');
    mkdirSync(phaseDir, { recursive: true });
    writeFileSync(join(phaseDir, '04-01-PLAN.md'), '---\nphase: "04"\nplan: "01"\n---\n# do thing\n');

    const res = assembleState(planning, projectPath);
    expect(res.kind).toBe('state');
    if (res.kind !== 'state') return;
    expect(res.state.warnings).toEqual(['no STATE.md']);
    expect(res.state.phases.length).toBe(1);
    expect(res.state.phases[0]!.plans.length).toBe(1);
  });

  it('returns kind:state with "STATE.md unparseable" when STATE.md exists but has no parsable frontmatter', () => {
    const phaseDir = join(planning, 'phases', '04-thing');
    mkdirSync(phaseDir, { recursive: true });
    writeFileSync(join(phaseDir, '04-01-PLAN.md'), '---\nphase: "04"\nplan: "01"\n---\n');
    // STATE.md with no frontmatter at all — parseState returns {} → flagged.
    writeFileSync(join(planning, 'STATE.md'), '# just a heading, no yaml\n');

    const res = assembleState(planning, projectPath);
    expect(res.kind).toBe('state');
    if (res.kind !== 'state') return;
    expect(res.state.warnings).toEqual(['STATE.md unparseable']);
    expect(res.state.phases.length).toBe(1);
  });

  it('returns kind:state with no warnings on a well-formed planning/ tree', () => {
    const phaseDir = join(planning, 'phases', '04-thing');
    mkdirSync(phaseDir, { recursive: true });
    writeFileSync(join(phaseDir, '04-01-PLAN.md'), '---\nphase: "04"\nplan: "01"\n---\n');
    writeFileSync(
      join(planning, 'STATE.md'),
      '---\nmilestone: m1\nactive_phase: 04-thing\nnext_action: /gsd-foo\n---\n',
    );

    const res = assembleState(planning, projectPath);
    expect(res.kind).toBe('state');
    if (res.kind !== 'state') return;
    expect(res.state.warnings).toBeUndefined();
    expect(res.state.activePhase).toBe('04-thing');
    expect(res.state.nextAction).toBe('/gsd-foo');
  });
});
