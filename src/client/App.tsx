import { useEffect, useState } from 'react';
import type { StateResponse } from '../types/state.ts';
import { TopBar } from './components/TopBar.js';
import { StagesColumn } from './components/StagesColumn.js';
import { PlansColumn } from './components/PlansColumn.js';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; response: StateResponse };

export default function App() {
  const [fs, setFs] = useState<FetchState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/state')
      .then((r) => r.json())
      .then((data: StateResponse) => {
        if (!cancelled) setFs({ kind: 'ready', response: data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setFs({ kind: 'error', message: String(err) });
      });
    return () => { cancelled = true; };
  }, []);

  if (fs.kind === 'loading') {
    return (
      <div className="vigil-shell">
        <header className="topbar"><span className="brand">vigil</span></header>
        <main className="empty"><div className="empty-content">
          <p className="empty-sub">loading…</p>
        </div></main>
      </div>
    );
  }
  if (fs.kind === 'error') {
    return (
      <div className="vigil-shell">
        <header className="topbar"><span className="brand">vigil</span></header>
        <main className="empty"><div className="empty-content">
          <h1 className="empty-title">could not reach vigil server.</h1>
          <p className="empty-sub">{fs.message}</p>
        </div></main>
      </div>
    );
  }

  const res = fs.response;
  if (res.kind === 'empty') {
    return <EmptyView variant={res.empty.variant} projectPath={res.empty.projectPath} />;
  }

  const state = res.state;
  const phase = state.phases[0];
  return (
    <div className="vigil-shell">
      <TopBar state={state} />
      <div className="body-grid">
        {phase ? <StagesColumn phase={phase} /> : <aside className="stages" />}
        {phase ? <PlansColumn phase={phase} /> : <main className="main" />}
      </div>
    </div>
  );
}

function EmptyView({ variant, projectPath }: { variant: string; projectPath: string }) {
  const titles: Record<string, [string, string]> = {
    'no-planning':      ['no .planning/ found.',          'point vigil at a project, or run a workflow that creates one.'],
    'newborn-planning': ['this project is between\ndiscuss and plan.', 'no phases yet — the candle is lit, the page is blank.'],
    'partial-planning': ['planning is partially formed.', 'showing what could be parsed.'],
  };
  const [title, sub] = titles[variant] ?? titles['no-planning']!;
  return (
    <div className="vigil-shell">
      <header className="topbar">
        <span className="brand">vigil</span>
        <span className="brand-dot">·</span>
        <span className="project-path">{projectPath}</span>
      </header>
      <main className="empty">
        <div className="empty-content">
          <h1 className="empty-title">{title.split('\n').map((l, i) => <span key={i}>{l}<br/></span>)}</h1>
          <p className="empty-sub">{sub}</p>
        </div>
      </main>
    </div>
  );
}
