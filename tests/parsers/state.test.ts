import { describe, expect, it } from 'vitest';
import { parseState } from '../../src/parsers/state.js';

const FULL = `---
milestone: v1.0
milestone_name: foundation
status: executing
active_phase: 4.5
next_action: /gsd-execute-phase 4.5
next_phases:
  - "5.0"
  - "5.1"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 6
  completed_plans: 4
  percent: 67
---

# body
`;

describe('parseState', () => {
  it('extracts the documented field set', () => {
    const s = parseState(FULL);
    expect(s.milestone).toBe('v1.0');
    expect(s.milestoneName).toBe('foundation');
    expect(s.status).toBe('executing');
    expect(s.activePhase).toBe('4.5');
    expect(s.nextAction).toBe('/gsd-execute-phase 4.5');
    expect(s.nextPhases).toEqual(['5.0', '5.1']);
    expect(s.progress?.percent).toBe(67);
  });

  it('returns an empty object when frontmatter is absent', () => {
    expect(parseState('no frontmatter at all\n\njust a body')).toEqual({});
  });

  it('tolerates missing active_phase', () => {
    const s = parseState('---\nmilestone: v1\n---\n');
    expect(s.milestone).toBe('v1');
    expect(s.activePhase).toBeUndefined();
  });

  it('accepts numeric active_phase by coercing to string', () => {
    const s = parseState('---\nactive_phase: 3\n---\n');
    expect(s.activePhase).toBe('3');
  });

  it('tolerates block-sequence next_phases', () => {
    const s = parseState('---\nnext_phases:\n  - a\n  - b\n---\n');
    expect(s.nextPhases).toEqual(['a', 'b']);
  });
});
