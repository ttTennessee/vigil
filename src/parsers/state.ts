import matter from 'gray-matter';

export interface ParsedState {
  milestone?: string;
  milestoneName?: string;
  status?: string;
  activePhase?: string;
  nextAction?: string;
  nextPhases?: string[];
  progress?: ParsedProgress;
}

export interface ParsedProgress {
  totalPhases?: number;
  completedPhases?: number;
  totalPlans?: number;
  completedPlans?: number;
  percent?: number;
}

export function parseState(text: string): ParsedState {
  let data: Record<string, unknown> = {};
  try {
    data = matter(text).data ?? {};
  } catch {
    return {};
  }

  const out: ParsedState = {};
  const str = (k: string): string | undefined => {
    const v = data[k];
    return typeof v === 'string' ? v : undefined;
  };

  const milestone = str('milestone');
  if (milestone !== undefined) out.milestone = milestone;
  const milestoneName = str('milestone_name');
  if (milestoneName !== undefined) out.milestoneName = milestoneName;
  const status = str('status');
  if (status !== undefined) out.status = status;
  const activePhase = data['active_phase'];
  if (typeof activePhase === 'string') out.activePhase = activePhase;
  else if (typeof activePhase === 'number') out.activePhase = String(activePhase);
  const nextAction = str('next_action');
  if (nextAction !== undefined) out.nextAction = nextAction;

  const nextPhases = data['next_phases'];
  if (Array.isArray(nextPhases)) {
    out.nextPhases = nextPhases
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .map((v) => String(v));
  }

  const progress = data['progress'];
  if (progress && typeof progress === 'object' && !Array.isArray(progress)) {
    const p = progress as Record<string, unknown>;
    const num = (k: string): number | undefined =>
      typeof p[k] === 'number' ? (p[k] as number) : undefined;
    const parsed: ParsedProgress = {};
    const a = num('total_phases'); if (a !== undefined) parsed.totalPhases = a;
    const b = num('completed_phases'); if (b !== undefined) parsed.completedPhases = b;
    const c = num('total_plans'); if (c !== undefined) parsed.totalPlans = c;
    const d = num('completed_plans'); if (d !== undefined) parsed.completedPlans = d;
    const e = num('percent'); if (e !== undefined) parsed.percent = e;
    out.progress = parsed;
  }

  return out;
}
