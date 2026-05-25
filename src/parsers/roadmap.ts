export interface ParsedRoadmap {
  // Keyed by short plan id (e.g. "03-01"). Value is the human-readable name
  // taken from the prose after the em-dash on each plan line.
  planNames: Record<string, string>;
}

// Matches lines like:
//   - [x] 03-01-PLAN.md — Type extensions, API functions (...)
//   - [ ] 02-01-PLAN.md - Foundation: types, API module
//   - [X] 4.5-03-PLAN.md – refactor-state
// Tolerant of em-dash "—", en-dash "–", ASCII hyphen "-", and surrounding whitespace.
const PLAN_LINE_RE =
  /^\s*-\s*\[[ xX]\]\s*([\d.]+-\d+)-PLAN\.md\s*(?:[—–]|-{1,2})\s*(.+?)\s*$/gm;

export function parseRoadmap(text: string): ParsedRoadmap {
  const planNames: Record<string, string> = {};
  PLAN_LINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLAN_LINE_RE.exec(text)) !== null) {
    const id = m[1];
    const name = m[2];
    if (id && name && !(id in planNames)) {
      planNames[id] = name.trim();
    }
  }
  return { planNames };
}
