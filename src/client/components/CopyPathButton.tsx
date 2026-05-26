import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  absPath: string;
  // Optional visual variant; default is the muted footer / inline form.
  // Same look in both for now — kept as an arg in case we differentiate.
  variant?: 'footer' | 'inline';
}

const COPIED_MS = 900;

export function CopyPathButton({ absPath, variant = 'footer' }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const onClick = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const write = navigator.clipboard?.writeText?.(absPath);
      const settle = () => {
        setCopied(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), COPIED_MS);
      };
      if (write && typeof write.then === 'function') {
        write.then(settle).catch(() => {
          // Clipboard API can reject on insecure contexts; fail quiet.
        });
      } else {
        settle();
      }
    },
    [absPath],
  );

  return (
    <button
      type="button"
      className={`copy-path copy-path--${variant}`}
      title={`copy path: ${absPath}`}
      aria-label="copy path"
      onClick={onClick}
    >
      <span aria-hidden="true" className="copy-path-icon">⎘</span>
      {copied && <span className="copy-path-toast">path copied</span>}
    </button>
  );
}
