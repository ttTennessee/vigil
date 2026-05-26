import { useEffect, useState } from 'react';

// Single ticker shared by every relative-time chip on the page. 20s
// cadence is the sweet spot for "12s ago" → "47s ago" updates without
// being noisy. Returns epoch seconds.
export function useNow(intervalMs = 20_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
