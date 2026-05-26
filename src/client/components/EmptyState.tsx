import type { EmptyResponse } from '../../types/state.ts';
import { RecentSwitcher } from './RecentSwitcher.js';

function shortenPath(p: string): string {
  const home = '/home/';
  if (p.startsWith(home)) {
    const slash = p.indexOf('/', home.length);
    if (slash > 0) return '~' + p.slice(slash);
  }
  return p;
}

function Shell({ projectPath, children }: { projectPath: string; children: React.ReactNode }) {
  return (
    <div className="vigil-shell">
      <header className="topbar">
        <span className="brand">vigil</span>
        <span className="brand-dot">·</span>
        <RecentSwitcher currentPath={projectPath} />
        <span className="project-path">{shortenPath(projectPath)}</span>
      </header>
      <main className="empty"><div className="empty-content">{children}</div></main>
    </div>
  );
}

export function EmptyState({ empty }: { empty: EmptyResponse }) {
  if (empty.variant === 'no-planning') {
    return (
      <Shell projectPath={empty.projectPath}>
        <h1 className="empty-title">no .planning/ found.</h1>
        <p className="empty-sub">
          searched up from <code>{empty.projectPath}</code> to your home directory.
        </p>
        <p className="empty-sub">
          point vigil at a project, or run a workflow that creates one.
        </p>
      </Shell>
    );
  }

  if (empty.variant === 'newborn-planning') {
    const evidence = empty.evidence ?? [];
    return (
      <Shell projectPath={empty.projectPath}>
        <h1 className="empty-title">this project is between<br />discuss and plan.</h1>
        <p className="empty-sub">no phases yet — the candle is lit, the page is blank.</p>
        {evidence.length > 0 && (
          <div className="empty-evidence">
            <div className="ev-label">Evidence so far</div>
            {evidence.map((e) => (
              <div key={e.name} className={`ev-row ${e.present ? 'has' : 'miss'}`}>
                <span className="ev-glyph">{e.present ? '✓' : '○'}</span>
                {e.name}
              </div>
            ))}
          </div>
        )}
        <div className="empty-hint">
          run <code>/gsd-plan-phase</code> to produce the first phase.
        </div>
      </Shell>
    );
  }

  // partial-planning — degenerate fallback. In practice the server returns a
  // best-effort `kind: 'state'` with a topbar warning chip rather than this
  // branch, but the spec lists three variants so we render one here too.
  return (
    <Shell projectPath={empty.projectPath}>
      <h1 className="empty-title">planning is partially formed.</h1>
      <p className="empty-sub">showing what could be parsed.</p>
    </Shell>
  );
}
