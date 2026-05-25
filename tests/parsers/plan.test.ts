import { describe, expect, it } from 'vitest';
import { parsePlan } from '../../src/parsers/plan.js';

const FULL = `---
phase: 03-foo
plan: 03-02
type: execute
wave: 2
depends_on:
  - 03-01
files_modified:
  - a.ts
  - b.ts
autonomous: false
requirements:
  - LOC-01
  - LOC-02
must_haves:
  truths:
    - "ignored"
user_setup: []
---

body
`;

describe('parsePlan', () => {
  it('extracts only the Q12 field set', () => {
    const p = parsePlan(FULL);
    expect(p.phase).toBe('03-foo');
    expect(p.plan).toBe('03-02');
    expect(p.wave).toBe(2);
    expect(p.dependsOn).toEqual(['03-01']);
    expect(p.filesModified).toEqual(['a.ts', 'b.ts']);
    expect(p.autonomous).toBe(false);
    expect(p.requirements).toEqual(['LOC-01', 'LOC-02']);
    // D7: must_haves, user_setup, type must not appear
    expect((p as Record<string, unknown>)['mustHaves']).toBeUndefined();
    expect((p as Record<string, unknown>)['userSetup']).toBeUndefined();
    expect((p as Record<string, unknown>)['type']).toBeUndefined();
  });

  it('applies defaults when optional fields are missing', () => {
    const p = parsePlan('---\nphase: 01\nplan: 01-01\n---\n');
    expect(p.wave).toBe(1);
    expect(p.dependsOn).toEqual([]);
    expect(p.autonomous).toBe(true);
    expect(p.filesModified).toEqual([]);
    expect(p.requirements).toEqual([]);
  });

  it('does not throw on malformed YAML — degrades to defaults', () => {
    const p = parsePlan('---\nwave: [unclosed\n---\n');
    expect(p.wave).toBe(1);
    expect(p.phase).toBe('');
  });

  it('coerces numeric plan id to string', () => {
    const p = parsePlan('---\nphase: 1\nplan: 2\n---\n');
    expect(p.phase).toBe('1');
    expect(p.plan).toBe('2');
  });
});
