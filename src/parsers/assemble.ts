import type { Phase, Plan, PlanStatus, StageArtifact, StageName, StageStatus } from '../types/state.ts';
import type { ParsedPlan } from './plan.ts';
import type { ParsedSummary } from './summary.ts';

export const STAGE_ORDER: StageName[] = [
  'discuss',
  'ui',
  'plan',
  'execute',
  'verify',
  'ui-review',
];

export interface PhaseInput {
  phaseId: string;          // directory basename, e.g. "03-drug-assignment-and-lookup"
  phaseMtime: number;       // epoch seconds — newest file mtime in the dir
  stateActivePhase?: string; // STATE.activePhase value (frontmatter), if any
  plans: { plan: ParsedPlan; summary: ParsedSummary | null }[];
  // All artifacts found per stage, each {label,path}. Missing / empty arrays
  // mean the stage has no artifact on disk. Non-empty drives "is this stage
  // done"; the array itself drives the StagesColumn expand sub-items.
  stagePresence: Partial<Record<StageName, StageArtifact[]>>;
  planNames?: Record<string, string>;  // keyed by short plan id (e.g. "03-01")
}

export type AssembledPhase = Phase;

const PHASE_DIR_RE = /^(\d+)-(.+)$/;

function deriveNumber(phaseId: string): string {
  const m = PHASE_DIR_RE.exec(phaseId);
  if (!m) return phaseId;
  return String(Number(m[1]));
}

function deriveName(phaseId: string): string {
  const m = PHASE_DIR_RE.exec(phaseId);
  if (!m || !m[2]) return phaseId;
  return m[2].replace(/-/g, ' ');
}

function derivePlanStatus(
  plan: ParsedPlan,
  summary: ParsedSummary | null,
  phaseId: string,
  stateActivePhase: string | undefined,
): PlanStatus {
  if (summary) {
    if (summary.failureMarker === 'FAILED') return 'failed';
    return 'done';
  }
  const matches =
    !!stateActivePhase &&
    (stateActivePhase === phaseId || stateActivePhase === deriveNumber(phaseId));
  if (matches) return 'running';
  return 'pending';
}

function shortPhaseNumber(phase: string): string {
  const m = /^(\d+(?:\.\d+)?)/.exec(phase);
  return m ? m[1]! : phase;
}

function buildPlanId(phase: string, plan: string): string {
  if (!phase) return plan;
  if (!plan) return shortPhaseNumber(phase);
  // If plan already has the form "<phase>-<plan>" (e.g. "02-01", "4.5-03"),
  // trust it as-is. This covers GSD projects where the plan field is the full
  // short id regardless of how the phase field is written ("2" vs "02-foo").
  if (/^[\d.]+-\d+$/.test(plan)) return plan;
  return `${shortPhaseNumber(phase)}-${plan}`;
}

export function assemblePhase(input: PhaseInput): AssembledPhase {
  const { phaseId, phaseMtime, stateActivePhase, plans, stagePresence, planNames } = input;

  const assembledPlans: Plan[] = plans.map(({ plan, summary }) => {
    const status = derivePlanStatus(plan, summary, phaseId, stateActivePhase);
    const planId = buildPlanId(plan.phase, plan.plan);
    const out: Plan = {
      id: planId,
      phase: plan.phase,
      plan: plan.plan,
      wave: plan.wave,
      dependsOn: plan.dependsOn,
      filesModified: plan.filesModified,
      autonomous: plan.autonomous,
      requirements: plan.requirements,
      status,
      phaseMtime,
      failureMarker: summary ? summary.failureMarker : null,
    };
    const name = planNames?.[planId];
    if (name) out.name = name;
    return out;
  });

  assembledPlans.sort((a, b) => {
    if (a.wave !== b.wave) return a.wave - b.wave;
    return a.id.localeCompare(b.id);
  });

  const failedPlanCount = assembledPlans.filter((p) => p.status === 'failed').length;

  const hasRunning = assembledPlans.some((p) => p.status === 'running');
  const executeArtifacts = stagePresence.execute ?? [];
  const anyExecutePresent = executeArtifacts.length > 0 || assembledPlans.length > 0;

  const stages: { name: StageName; status: StageStatus; artifacts: StageArtifact[] }[] = STAGE_ORDER.map((name) => {
    const artifacts = stagePresence[name] ?? [];
    const present = artifacts.length > 0;
    let status: StageStatus;
    if (name === 'execute') {
      if (hasRunning) status = 'current';
      else if (anyExecutePresent && assembledPlans.every((p) => p.status === 'done' || p.status === 'failed')) {
        status = assembledPlans.length > 0 ? 'done' : 'pending';
      } else {
        status = anyExecutePresent ? 'current' : 'pending';
      }
    } else {
      status = present ? 'done' : 'pending';
    }
    return { name, status, artifacts };
  });

  const hasCurrent = stages.some((s) => s.status === 'current');
  if (!hasCurrent) {
    for (let i = stages.length - 1; i >= 0; i--) {
      if (stages[i]!.status === 'done') {
        if (i + 1 < stages.length) {
          const next = stages[i + 1]!;
          stages[i + 1] = { name: next.name, status: 'current', artifacts: next.artifacts };
        }
        break;
      }
    }
  }

  return {
    id: phaseId,
    number: deriveNumber(phaseId),
    name: deriveName(phaseId),
    stages,
    plans: assembledPlans,
    failedPlanCount,
  };
}
