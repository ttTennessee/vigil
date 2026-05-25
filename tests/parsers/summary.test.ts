import { describe, expect, it } from 'vitest';
import { parseSummary } from '../../src/parsers/summary.js';

describe('parseSummary', () => {
  it('detects PASSED at line-start', () => {
    const s = parseSummary('---\nplan: 1-1\n---\n\n## Self-Check: PASSED\n\nbody');
    expect(s.failureMarker).toBe('PASSED');
  });

  it('detects FAILED', () => {
    const s = parseSummary('## Self-Check: FAILED\n');
    expect(s.failureMarker).toBe('FAILED');
  });

  it('returns null when the marker is absent', () => {
    expect(parseSummary('some summary\n## Outcomes\nfoo').failureMarker).toBeNull();
  });

  it('only matches at line-start (not mid-body)', () => {
    expect(parseSummary('intro: ## Self-Check: FAILED maybe\n').failureMarker).toBeNull();
  });

  it('handles SUMMARY with no frontmatter', () => {
    expect(parseSummary('## Self-Check: PASSED').failureMarker).toBe('PASSED');
  });
});
