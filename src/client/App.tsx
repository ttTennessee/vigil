// Minimal v0.0.1 shell: a single empty-state screen.
// Detail view, drawer, SSE wiring all arrive in later commits.

export default function App() {
  return (
    <div className="vigil-shell">
      <header className="topbar">
        <span className="brand">vigil</span>
      </header>

      <main className="empty">
        <div className="empty-content">
          <h1 className="empty-title">no .planning/ found.</h1>
          <p className="empty-sub">point vigil at a project, or run a workflow that creates one.</p>
        </div>
      </main>

      <style>{`
        .vigil-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .topbar {
          height: 64px;
          padding: 0 32px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--hairline);
        }
        .brand {
          font-family: var(--font-display);
          font-variation-settings: 'opsz' 24, 'SOFT' 60, 'WONK' 1;
          font-weight: 400;
          font-size: 20px;
          letter-spacing: -0.01em;
          color: var(--fg);
        }
        .empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 32px;
        }
        .empty-content { max-width: 540px; }
        .empty-title {
          font-family: var(--font-display);
          font-variation-settings: 'opsz' 48, 'SOFT' 80, 'WONK' 1;
          font-weight: 400;
          font-size: 32px;
          line-height: 1.2;
          color: var(--fg);
          margin: 0 0 16px;
          letter-spacing: -0.015em;
        }
        .empty-sub {
          font-family: var(--font-display);
          font-variation-settings: 'opsz' 14, 'SOFT' 60;
          font-style: italic;
          font-size: 14px;
          color: var(--fg-muted);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
