import type { Phase, State } from '../../types/state.ts';

function shortenPath(p: string): string {
  const home = '/home/';
  if (p.startsWith(home)) {
    const slash = p.indexOf('/', home.length);
    if (slash > 0) return '~' + p.slice(slash);
  }
  return p;
}

function phaseHeading(phase: Phase | undefined): string {
  if (!phase) return '';
  const name = phase.name.replace(/\b\w/g, (c) => c.toUpperCase());
  return `Phase ${phase.number} — ${name}`;
}

export function TopBar({ state }: { state: State }) {
  const phase = state.phases[0];
  return (
    <header className="topbar">
      <span className="brand">vigil</span>
      <span className="brand-dot">·</span>
      <span className="project-path">{shortenPath(state.projectPath)}</span>
      {phase && <span className="phase-title">{phaseHeading(phase)}</span>}
      {phase && phase.failedPlanCount > 0 && (
        <button type="button" className="phase-summary-chip">
          {phase.failedPlanCount} plan{phase.failedPlanCount === 1 ? '' : 's'} failed
        </button>
      )}
      {state.nextAction && (
        <span className="next-action">
          <span className="glyph">▶</span> {state.nextAction}
        </span>
      )}
    </header>
  );
}
