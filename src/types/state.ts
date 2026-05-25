// Shared types between server and client. No logic.

export type StageName =
  | 'discuss'
  | 'ui'
  | 'plan'
  | 'execute'
  | 'verify'
  | 'ui-review';

export type StageStatus = 'done' | 'current' | 'pending';

export type PlanStatus = 'done' | 'running' | 'pending' | 'failed';

export interface Plan {
  id: string;            // {phase}-{plan}, e.g. "4.5-03"
  phase: string;
  plan: string;
  wave: number;
  dependsOn: string[];
  filesModified: string[];
  autonomous: boolean;
  requirements: string[];
  status: PlanStatus;
  // raw mtime (epoch seconds) of newest file in this phase dir, used for
  // the evidence chip next to the ◐ glyph (D6).
  phaseMtime: number;
  failureMarker?: 'PASSED' | 'FAILED' | null;
}

export interface Phase {
  id: string;            // phase directory basename, e.g. "04-cabinet-layout"
  number: string;        // "4.5"
  name: string;          // "Code Quality"
  stages: { name: StageName; status: StageStatus }[];
  plans: Plan[];
  failedPlanCount: number;
}

export interface State {
  projectPath: string;
  milestone?: string;
  activePhase?: string;
  nextAction?: string;
  nextPhases?: string[];
  phases: Phase[];
}

export type EmptyVariant = 'no-planning' | 'newborn-planning' | 'partial-planning';

export interface EmptyResponse {
  variant: EmptyVariant;
  projectPath: string;
  evidence?: { name: string; present: boolean }[];
}

export type StateResponse =
  | { kind: 'state'; state: State }
  | { kind: 'empty'; empty: EmptyResponse };
