// Format epoch-seconds as "12s ago" / "47m ago" / "3h ago" / "2d ago".
// `now` is also epoch seconds so callers can share a single tick across
// many chips (see useNow hook).
export function formatAgo(epochSec: number, nowSec: number): string {
  const diff = Math.max(0, nowSec - epochSec);
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Stale boundary for the running chip. Past this point the chip shifts
// toward terracotta (D6 — evidence, not alert). Kept internal: no env
// var, no config key.
export const STALE_AFTER_SECONDS = 30 * 60;

export function isStale(epochSec: number, nowSec: number): boolean {
  return nowSec - epochSec >= STALE_AFTER_SECONDS;
}
