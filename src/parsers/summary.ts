import matter from 'gray-matter';

export interface ParsedSummary {
  failureMarker: 'PASSED' | 'FAILED' | null;
}

const SELF_CHECK_RE = /^## Self-Check: (PASSED|FAILED)$/m;

export function parseSummary(text: string): ParsedSummary {
  let body = text;
  try {
    body = matter(text).content;
  } catch {
    body = text;
  }
  const m = SELF_CHECK_RE.exec(body);
  if (!m) return { failureMarker: null };
  return { failureMarker: m[1] as 'PASSED' | 'FAILED' };
}
