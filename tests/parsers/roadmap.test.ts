import { describe, expect, it } from 'vitest';
import { parseRoadmap } from '../../src/parsers/roadmap.js';

const SAMPLE = `# Roadmap: Foo

## Phases

- [ ] **Phase 1: Backend Foundation** - Data model, seed data
- [x] **Phase 2: Visual Cabinet Layout** - Read-only graphical layout
- [ ] **Phase 3: Drug Assignment and Lookup** - Permission-gated stuff

## Phase Details

### Phase 1: Backend Foundation

Plans:
- [X] 01-01-PLAN.md — Database schema (Liquibase migration: 2 tables + 92-slot seed data)
- [X] 01-02-PLAN.md — API layer: Mapper, Service, Controller

### Phase 2: Visual Cabinet Layout

Plans:
- [x] 02-01-PLAN.md — Foundation: types, API module, route, sidebar menu
- [x] 02-02-PLAN.md — Components: CabinetGrid, CabinetSlot, CabinetLayout page

### Phase 3: Drug Assignment and Lookup

Plans:
- [ ] 03-01-PLAN.md — Type extensions, API functions (assignApi/unassignApi/searchMedicineApi), normalizeSlot maxCapacity preservation
- [ ] 03-02-PLAN.md — Interactive CabinetSlot/CabinetGrid, search bar, permission-gated dialog
`;

describe('parseRoadmap', () => {
  it('extracts plan names keyed by short plan id', () => {
    const r = parseRoadmap(SAMPLE);
    expect(r.planNames['01-01']).toBe('Database schema (Liquibase migration: 2 tables + 92-slot seed data)');
    expect(r.planNames['02-01']).toBe('Foundation: types, API module, route, sidebar menu');
    expect(r.planNames['03-02']).toBe('Interactive CabinetSlot/CabinetGrid, search bar, permission-gated dialog');
  });

  it('handles all six plans from the fixture', () => {
    const r = parseRoadmap(SAMPLE);
    expect(Object.keys(r.planNames).sort()).toEqual([
      '01-01', '01-02', '02-01', '02-02', '03-01', '03-02',
    ]);
  });

  it('tolerates en-dash and ASCII hyphen separators', () => {
    const txt = `- [x] 01-01-PLAN.md – en-dash name\n- [ ] 02-01-PLAN.md - ascii hyphen name`;
    const r = parseRoadmap(txt);
    expect(r.planNames['01-01']).toBe('en-dash name');
    expect(r.planNames['02-01']).toBe('ascii hyphen name');
  });

  it('returns empty when no plan lines present', () => {
    expect(parseRoadmap('# Just a heading\nno plans here').planNames).toEqual({});
  });

  it('accepts decimal phase numbers like 4.5-03', () => {
    const r = parseRoadmap('- [ ] 4.5-03-PLAN.md — refactor-state');
    expect(r.planNames['4.5-03']).toBe('refactor-state');
  });

  it('does not double-record the same plan id', () => {
    const txt = `- [ ] 01-01-PLAN.md — first\n- [x] 01-01-PLAN.md — second`;
    const r = parseRoadmap(txt);
    expect(r.planNames['01-01']).toBe('first');
  });
});
