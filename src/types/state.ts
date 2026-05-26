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
  name?: string;         // human-readable, sourced from ROADMAP.md plan line
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

export interface StageArtifact {
  // Sub-item label shown under an expanded stage row, e.g. "01-PLAN" or
  // "DISCUSSION-LOG". Derived from the filename by stripping the phase
  // prefix and ".md" extension.
  label: string;
  path: string;          // .planning/-relative
}

export interface Phase {
  id: string;            // phase directory basename, e.g. "04-cabinet-layout"
  number: string;        // "4.5"
  name: string;          // "Code Quality"
  stages: { name: StageName; status: StageStatus; artifacts: StageArtifact[] }[];
  plans: Plan[];
  failedPlanCount: number;
}

export interface State {
  projectPath: string;
  // Absolute path of the .planning/ directory; clients join artifactPath
  // (which is .planning/-relative) against it to get an absolute file path
  // for the editor-open URL.
  planningDir: string;
  // URL-scheme template forwarded from the server's VIGIL_OPEN_URL env var
  // (validated at boot). Omitted when the default is in effect; clients
  // fall back to vscode://file/%s in openInEditor() either way.
  openUrlTemplate?: string;
  milestone?: string;
  activePhase?: string;
  nextAction?: string;
  nextPhases?: string[];
  phases: Phase[];
  // Non-fatal observations the UI surfaces as a small evidence chip in the
  // topbar — e.g. STATE.md missing or unparseable. D7: degrade quietly, no
  // popups, just a chip.
  warnings?: string[];
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
