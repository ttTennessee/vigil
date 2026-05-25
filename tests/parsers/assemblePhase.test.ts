import { describe, expect, it } from 'vitest';
import { assemblePhase } from '../../src/parsers/assemble.js';
import type { ParsedPlan } from '../../src/parsers/plan.js';

function plan(over: Partial<ParsedPlan> = {}): ParsedPlan {
  return {
    phase: '04',
    plan: '01',
    wave: 1,
    dependsOn: [],
    filesModified: [],
    autonomous: true,
    requirements: [],
    ...over,
  };
}

describe('assemblePhase', () => {
  it('marks all plans done when every SUMMARY exists with no FAILED marker', () => {
    const out = assemblePhase({
      phaseId: '04-thing',
      phaseMtime: 1000,
      stateActivePhase: '04-thing',
      plans: [
        { plan: plan({ plan: '01' }), summary: { failureMarker: 'PASSED' } },
        { plan: plan({ plan: '02' }), summary: { failureMarker: null } },
      ],
      stagePresence: { execute: "phases/01-x/01-01-SUMMARY.md" },
    });
    expect(out.plans.map((p) => p.status)).toEqual(['done', 'done']);
    expect(out.failedPlanCount).toBe(0);
  });

  it('marks plan running when active_phase matches and no SUMMARY exists', () => {
    const out = assemblePhase({
      phaseId: '04-thing',
      phaseMtime: 1000,
      stateActivePhase: '04-thing',
      plans: [{ plan: plan({ plan: '01' }), summary: null }],
      stagePresence: { execute: "phases/01-x/01-01-SUMMARY.md" },
    });
    expect(out.plans[0]!.status).toBe('running');
  });

  it('keeps a plan pending when active_phase does NOT match', () => {
    const out = assemblePhase({
      phaseId: '04-thing',
      phaseMtime: 1000,
      stateActivePhase: '05-something-else',
      plans: [{ plan: plan({ plan: '01' }), summary: null }],
      stagePresence: { execute: "phases/01-x/01-01-SUMMARY.md" },
    });
    expect(out.plans[0]!.status).toBe('pending');
  });

  it('marks failed plans and counts them on the phase', () => {
    const out = assemblePhase({
      phaseId: '04-thing',
      phaseMtime: 1000,
      stateActivePhase: '04-thing',
      plans: [
        { plan: plan({ plan: '01' }), summary: { failureMarker: 'FAILED' } },
        { plan: plan({ plan: '02' }), summary: { failureMarker: 'PASSED' } },
      ],
      stagePresence: { execute: "phases/01-x/01-01-SUMMARY.md" },
    });
    expect(out.plans[0]!.status).toBe('failed');
    expect(out.failedPlanCount).toBe(1);
  });

  it('groups plans by wave (and missing wave defaults to 1)', () => {
    const out = assemblePhase({
      phaseId: '04-thing',
      phaseMtime: 1000,
      stateActivePhase: undefined,
      plans: [
        { plan: plan({ plan: '01', wave: 2 }), summary: null },
        { plan: plan({ plan: '02', wave: 1 }), summary: null },
        { plan: plan({ plan: '03' }), summary: null },
      ],
      stagePresence: { execute: "phases/01-x/01-01-SUMMARY.md" },
    });
    const waves = out.plans.map((p) => p.wave);
    expect(waves).toEqual([1, 1, 2]);
  });

  it('matches active phase by short number form (e.g. "3" matches "03-foo")', () => {
    const out = assemblePhase({
      phaseId: '03-foo',
      phaseMtime: 0,
      stateActivePhase: '3',
      plans: [{ plan: plan({ phase: '03-foo', plan: '01' }), summary: null }],
      stagePresence: { execute: "phases/01-x/01-01-SUMMARY.md" },
    });
    expect(out.plans[0]!.status).toBe('running');
  });

  it('builds short plan id: keeps plan as-is when it already carries the phase number', () => {
    // zs-style: phase="03-drug-assignment-and-lookup", plan="03-01" → id "03-01"
    const out = assemblePhase({
      phaseId: '03-drug-assignment-and-lookup',
      phaseMtime: 0,
      stateActivePhase: undefined,
      plans: [{ plan: plan({ phase: '03-drug-assignment-and-lookup', plan: '03-01' }), summary: null }],
      stagePresence: {},
    });
    expect(out.plans[0]!.id).toBe('03-01');
  });

  it('builds short plan id: trusts plan field when it is already a short id (zero-padded plan with unpadded phase)', () => {
    // vigil-style: phase="2", plan="02-01" → id "02-01" (not "2-02-01")
    const out = assemblePhase({
      phaseId: '02-foo',
      phaseMtime: 0,
      stateActivePhase: undefined,
      plans: [{ plan: plan({ phase: '2', plan: '02-01' }), summary: null }],
      stagePresence: {},
    });
    expect(out.plans[0]!.id).toBe('02-01');
  });

  it('builds short plan id: concatenates short phase number when plan does not carry it', () => {
    // swatch-style: phase="4.5", plan="03" → id "4.5-03"
    const out = assemblePhase({
      phaseId: '04-foo',
      phaseMtime: 0,
      stateActivePhase: undefined,
      plans: [{ plan: plan({ phase: '4.5', plan: '03' }), summary: null }],
      stagePresence: {},
    });
    expect(out.plans[0]!.id).toBe('4.5-03');
  });

  it('preserves non-autonomous flag through to the assembled plan', () => {
    const out = assemblePhase({
      phaseId: '04-thing',
      phaseMtime: 0,
      stateActivePhase: undefined,
      plans: [{ plan: plan({ autonomous: false }), summary: null }],
      stagePresence: {},
    });
    expect(out.plans[0]!.autonomous).toBe(false);
  });
});
