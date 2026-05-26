import { useCallback, useEffect, useRef, useState } from 'react';

interface RecentResponse {
  recent: string[];
  current: string | null;
}

function shorten(p: string): string {
  const home = '/home/';
  if (p.startsWith(home)) {
    const slash = p.indexOf('/', home.length);
    if (slash > 0) return '~' + p.slice(slash);
  }
  return p;
}

interface Props {
  currentPath: string;
}

export function RecentSwitcher({ currentPath }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RecentResponse | null>(null);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    fetch('/api/recent')
      .then((r) => r.json())
      .then((d: RecentResponse) => setData(d))
      .catch(() => setData({ recent: [], current: null }));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open) load();
    setOpen((v) => !v);
  };

  const handleSelect = async (path: string) => {
    if (path === currentPath || switching) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await fetch('/api/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      // SSE invalidate from the server will trigger a refetch; we also
      // refresh the recent list so the trigger reflects the new current.
      load();
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  };

  const items = data?.recent ?? [];

  return (
    <div className="recent-switcher" ref={rootRef}>
      <button
        type="button"
        className="recent-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleToggle}
        title="Switch project"
      >
        <span className="recent-trigger-glyph">▾</span>
      </button>
      {open && (
        <div className="recent-menu" role="listbox">
          {items.length === 0 ? (
            <div className="recent-empty">no recent projects</div>
          ) : (
            items.map((p) => {
              const isCurrent = p === currentPath;
              return (
                <button
                  type="button"
                  key={p}
                  role="option"
                  aria-selected={isCurrent}
                  className={`recent-item${isCurrent ? ' is-current' : ''}`}
                  onClick={() => handleSelect(p)}
                  disabled={switching}
                >
                  <span className="recent-item-mark">{isCurrent ? '●' : ' '}</span>
                  <span className="recent-item-path">{shorten(p)}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
