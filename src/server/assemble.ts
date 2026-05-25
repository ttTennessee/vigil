import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Phase, State, StateResponse, StageName } from '../types/state.ts';
import { STAGE_ORDER, assemblePhase } from '../parsers/assemble.js';
import { parsePlan } from '../parsers/plan.js';
import { parseRoadmap } from '../parsers/roadmap.js';
import { parseState } from '../parsers/state.js';
import { parseSummary } from '../parsers/summary.js';

const PLAN_RE  = /^(\d+)-(\d+)-PLAN\.md$/;
const SUM_RE   = /^(\d+)-(\d+)-SUMMARY\.md$/;
const PHASE_DIR_RE = /^(\d+)-(.+)$/;

const STAGE_FILE_HINTS: Record<StageName, RegExp[]> = {
  discuss:    [/-CONTEXT\.md$/i, /-DISCUSSION-LOG\.md$/i, /-RESEARCH\.md$/i],
  ui:         [/-UI-SPEC\.md$/i],
  plan:       [/-PLAN\.md$/i],
  execute:    [/-SUMMARY\.md$/i],
  verify:     [/-VERIFICATION\.md$/i],
  'ui-review':[/-REVIEW\.md$/i],
};

function safeRead(path: string): string | null {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
}

function newestMtime(dir: string): number {
  let newest = 0;
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return 0; }
  for (const name of entries) {
    try {
      const s = statSync(join(dir, name));
      const t = Math.floor(s.mtimeMs / 1000);
      if (t > newest) newest = t;
    } catch { /* ignore */ }
  }
  return newest;
}

function detectStagePresence(
  files: string[],
  phaseRelativeDir: string,
): Partial<Record<StageName, string>> {
  const out: Partial<Record<StageName, string>> = {};
  for (const stage of STAGE_ORDER) {
    const hints = STAGE_FILE_HINTS[stage];
    const match = files.find((f) => hints.some((re) => re.test(f)));
    if (match) out[stage] = `${phaseRelativeDir}/${match}`;
  }
  return out;
}

function listPhaseDirs(phasesRoot: string): string[] {
  try {
    return readdirSync(phasesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && PHASE_DIR_RE.test(d.name))
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function assemblePhaseFromDir(
  phaseDir: string,
  stateActivePhase: string | undefined,
  planNames: Record<string, string>,
): Phase {
  const phaseId = basename(phaseDir);
  let files: string[] = [];
  try { files = readdirSync(phaseDir); } catch { /* empty */ }

  const planFiles = files.filter((f) => PLAN_RE.test(f));
  const summaryFiles = new Set(files.filter((f) => SUM_RE.test(f)));

  const plans = planFiles.map((planFile) => {
    const m = PLAN_RE.exec(planFile)!;
    const summaryName = `${m[1]}-${m[2]}-SUMMARY.md`;
    const planText = safeRead(join(phaseDir, planFile)) ?? '';
    const parsedPlan = parsePlan(planText);
    // Filename is the canonical source of the plan id. GSD projects are not
    // consistent in frontmatter: some use `phase: 01-foo, plan: 01`, others
    // `phase: 2, plan: 02-01`, plus YAML drops zero-pads on bare integers.
    // The filename (e.g. "02-01-PLAN.md") always has the canonical short id,
    // and ROADMAP.md keys use the same form — so override both fields.
    parsedPlan.phase = m[1]!;
    parsedPlan.plan = m[2]!;
    let parsedSummary = null;
    if (summaryFiles.has(summaryName)) {
      const sumText = safeRead(join(phaseDir, summaryName)) ?? '';
      parsedSummary = parseSummary(sumText);
    }
    return { plan: parsedPlan, summary: parsedSummary };
  });

  return assemblePhase({
    phaseId,
    phaseMtime: newestMtime(phaseDir),
    stateActivePhase,
    plans,
    stagePresence: detectStagePresence(files, `phases/${phaseId}`),
    planNames,
  });
}

function pickActivePhase(phaseDirs: string[], stateActivePhase: string | undefined): string | undefined {
  if (!phaseDirs.length) return undefined;
  if (stateActivePhase) {
    const direct = phaseDirs.find((d) => d === stateActivePhase);
    if (direct) return direct;
    const m = phaseDirs.find((d) => {
      const mm = PHASE_DIR_RE.exec(d);
      return mm && String(Number(mm[1])) === stateActivePhase;
    });
    if (m) return m;
  }
  return phaseDirs[phaseDirs.length - 1];
}

export function assembleState(planningDir: string, projectPath: string): StateResponse {
  const stateText = safeRead(join(planningDir, 'STATE.md'));
  const phasesRoot = join(planningDir, 'phases');

  const phaseDirs = listPhaseDirs(phasesRoot);

  if (phaseDirs.length === 0) {
    const rootFiles = ['PROJECT.md', 'REQUIREMENTS.md', 'ROADMAP.md', 'STATE.md'];
    const evidence = rootFiles.map((name) => {
      let present = false;
      try { present = statSync(join(planningDir, name)).isFile(); } catch { /* */ }
      return { name, present };
    });
    evidence.push({ name: 'phases/', present: false });
    return {
      kind: 'empty',
      empty: { variant: 'newborn-planning', projectPath, evidence },
    };
  }

  const parsedState = stateText ? parseState(stateText) : {};

  const warnings: string[] = [];
  if (stateText === null) {
    warnings.push('no STATE.md');
  } else if (Object.keys(parsedState).length === 0) {
    warnings.push('STATE.md unparseable');
  }

  const roadmapText = safeRead(join(planningDir, 'ROADMAP.md'));
  if (!roadmapText) {
    console.warn(
      `vigil: ROADMAP.md missing in ${planningDir} — plan names will be blank. ` +
      `Run the gsd workflow to produce it.`,
    );
  }
  const planNames = roadmapText ? parseRoadmap(roadmapText).planNames : {};

  const activePhaseId = pickActivePhase(phaseDirs, parsedState.activePhase);
  const phases: Phase[] = [];
  if (activePhaseId) {
    phases.push(
      assemblePhaseFromDir(join(phasesRoot, activePhaseId), parsedState.activePhase, planNames),
    );
  }

  const state: State = {
    projectPath,
    phases,
  };
  if (parsedState.milestone !== undefined) state.milestone = parsedState.milestone;
  if (parsedState.activePhase !== undefined) state.activePhase = parsedState.activePhase;
  else if (activePhaseId) state.activePhase = activePhaseId;
  if (parsedState.nextAction !== undefined) state.nextAction = parsedState.nextAction;
  if (parsedState.nextPhases !== undefined) state.nextPhases = parsedState.nextPhases;
  if (warnings.length) state.warnings = warnings;

  return { kind: 'state', state };
}
