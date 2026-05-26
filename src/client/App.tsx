import { useCallback, useEffect, useState } from 'react';
import type { Plan, StageName, State, StateResponse } from '../types/state.ts';
import { TopBar } from './components/TopBar.js';
import { StagesColumn } from './components/StagesColumn.js';
import { PlansColumn, planRowId } from './components/PlansColumn.js';
import { EmptyState } from './components/EmptyState.js';
import { ArtifactDrawer } from './components/ArtifactDrawer.js';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; response: StateResponse };

// Slugs we look for, in priority order, when scrolling a failed plan's
// SUMMARY drawer. Self-Check is the canonical location; the others are
// where authors most commonly put the failure rationale when the
// Self-Check heading itself is bare.
const FAILURE_SLUGS = ['self-check', 'deviations', 'issues-encountered'];

function summaryPathFor(phaseId: string, plan: Plan): string {
  return `phases/${phaseId}/${plan.phase}-${plan.plan}-SUMMARY.md`;
}

export default function App() {
  const [fs, setFs] = useState<FetchState>({ kind: 'loading' });
  const [selectedStage, setSelectedStage] = useState<StageName>('execute');
  // Set when the user clicks a failed plan's chip — overrides the
  // stage-driven drawer for that one plan's SUMMARY.
  const [failureView, setFailureView] = useState<{ path: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const fetchState = () => {
      fetch('/api/state')
        .then((r) => r.json())
        .then((data: StateResponse) => {
          if (!cancelled) setFs({ kind: 'ready', response: data });
        })
        .catch((err: unknown) => {
          if (!cancelled) setFs({ kind: 'error', message: String(err) });
        });
    };

    const connect = () => {
      if (cancelled) return;
      es = new EventSource('/events');
      es.onopen = () => fetchState();
      es.addEventListener('invalidate', () => fetchState());
      es.onerror = () => {
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
          if (!cancelled) {
            reconnectTimer = window.setTimeout(connect, 1000);
          }
        }
      };
    };

    fetchState();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []);

  const handleSelectStage = useCallback((s: StageName) => {
    setFailureView(null);
    setSelectedStage(s);
  }, []);

  const handleOpenFailure = useCallback((plan: Plan) => {
    const res = (fs.kind === 'ready') ? fs.response : null;
    if (!res || res.kind !== 'state') return;
    const phase = res.state.phases[0];
    if (!phase) return;
    setFailureView({ path: summaryPathFor(phase.id, plan) });
  }, [fs]);

  const handleScrollToFirstFailed = useCallback((state: State) => {
    const phase = state.phases[0];
    if (!phase) return;
    const firstFailed = phase.plans.find((p) => p.status === 'failed');
    if (!firstFailed) return;
    // Make sure we're showing the plans column (close any drawer view).
    setFailureView(null);
    setSelectedStage('execute');
    // Defer so the plans column has a chance to mount after a drawer close.
    requestAnimationFrame(() => {
      const el = document.getElementById(planRowId(firstFailed.id));
      el?.scrollIntoView({ block: 'start' });
    });
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
    return <EmptyState empty={res.empty} />;
  }

  const state = res.state;
  const phase = state.phases[0];
  const activeStage = phase?.stages.find((s) => s.name === selectedStage);
  const stageDrawerPath =
    phase && selectedStage !== 'execute' && activeStage?.artifactPath
      ? activeStage.artifactPath
      : null;
  // Failure-chip drawer takes priority over stage-driven drawer.
  const drawerPath = failureView?.path ?? stageDrawerPath;

  return (
    <div className="vigil-shell">
      <TopBar
        state={state}
        onClickFailedCount={() => handleScrollToFirstFailed(state)}
      />
      <div className="body-grid">
        {phase ? (
          <StagesColumn
            phase={phase}
            selected={selectedStage}
            onSelect={handleSelectStage}
          />
        ) : (
          <aside className="stages" />
        )}
        {phase ? (
          drawerPath ? (
            <ArtifactDrawer
              artifactPath={drawerPath}
              planningDir={state.planningDir}
              projectPath={state.projectPath}
              openUrlTemplate={state.openUrlTemplate}
              scrollToSlugs={failureView ? FAILURE_SLUGS : undefined}
            />
          ) : (
            <PlansColumn phase={phase} onOpenFailure={handleOpenFailure} />
          )
        ) : (
          <main className="main" />
        )}
      </div>
    </div>
  );
}
