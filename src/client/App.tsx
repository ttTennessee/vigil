import { useEffect, useState } from 'react';
import type { StageName, StateResponse } from '../types/state.ts';
import { TopBar } from './components/TopBar.js';
import { StagesColumn } from './components/StagesColumn.js';
import { PlansColumn } from './components/PlansColumn.js';
import { EmptyState } from './components/EmptyState.js';
import { ArtifactDrawer } from './components/ArtifactDrawer.js';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; response: StateResponse };

export default function App() {
  const [fs, setFs] = useState<FetchState>({ kind: 'loading' });
  const [selectedStage, setSelectedStage] = useState<StageName>('execute');

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
  const showDrawer = !!phase && selectedStage !== 'execute' && !!activeStage?.artifactPath;
  return (
    <div className="vigil-shell">
      <TopBar state={state} />
      <div className="body-grid">
        {phase ? (
          <StagesColumn
            phase={phase}
            selected={selectedStage}
            onSelect={setSelectedStage}
          />
        ) : (
          <aside className="stages" />
        )}
        {phase ? (
          showDrawer ? (
            <ArtifactDrawer artifactPath={activeStage!.artifactPath!} />
          ) : (
            <PlansColumn phase={phase} />
          )
        ) : (
          <main className="main" />
        )}
      </div>
    </div>
  );
}
