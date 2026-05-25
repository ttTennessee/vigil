import { describe, it, expect } from 'vitest';
import { truncateMarkdown, splitFrontmatter, preprocessGsdTags } from '../../src/parsers/markdown.js';

describe('truncateMarkdown', () => {
  it('passes through text below both caps', () => {
    const text = 'a\nb\nc\n';
    const r = truncateMarkdown(text);
    expect(r.truncated).toBe(false);
    expect(r.body).toBe(text);
    expect(r.totalLines).toBe(4);
    expect(r.shownLines).toBe(4);
  });

  it('cuts at 500 lines when line cap hits first', () => {
    // 800 short lines — far below the 8000-char cap.
    const text = Array.from({ length: 800 }, (_, i) => `L${i}`).join('\n');
    const r = truncateMarkdown(text);
    expect(r.truncated).toBe(true);
    expect(r.shownLines).toBe(500);
    expect(r.totalLines).toBe(800);
    expect(r.body.split('\n').length).toBe(500);
  });

  it('cuts at next newline when char cap hits first (under 500 lines)', () => {
    // 50 lines of 400 chars each = 20_000 chars total, only 50 lines.
    const big = 'x'.repeat(400);
    const text = Array.from({ length: 50 }, () => big).join('\n');
    const r = truncateMarkdown(text);
    expect(r.truncated).toBe(true);
    expect(r.totalLines).toBe(50);
    // 8000 chars / 401 per line ≈ 20, so the first ~20 lines should be kept.
    expect(r.shownLines).toBeGreaterThan(0);
    expect(r.shownLines).toBeLessThan(50);
    // body ends on a full line (no half-line) — re-splitting matches.
    expect(r.body.split('\n').length).toBe(r.shownLines);
  });

  it('uses the tighter cap when both fire', () => {
    // 800 lines of 50 chars — 800 lines and ~40_000 chars total. Both caps
    // fire; line cap is the tighter one (stops at line 500, ~25_000 chars).
    const text = Array.from({ length: 800 }, () => 'x'.repeat(50)).join('\n');
    const r = truncateMarkdown(text);
    expect(r.truncated).toBe(true);
    expect(r.shownLines).toBeLessThanOrEqual(500);
  });
});

describe('preprocessGsdTags', () => {
  it('inserts blank lines around bare custom tag lines', () => {
    const input = ['<domain>', '## Heading', 'body line', '</domain>'].join('\n');
    const out = preprocessGsdTags(input);
    expect(out).toBe(
      ['<domain>', '', '## Heading', 'body line', '', '</domain>'].join('\n'),
    );
  });

  it('is a no-op when surrounding blank lines already exist (no underscores)', () => {
    const input = ['<domain>', '', '## Heading', '', '</domain>'].join('\n');
    expect(preprocessGsdTags(input)).toBe(input);
  });

  it('rewrites snake_case tag names to kebab-case', () => {
    const input = ['<canonical_refs>', '', '## Refs', '', '</canonical_refs>'].join('\n');
    expect(preprocessGsdTags(input)).toBe(
      ['<canonical-refs>', '', '## Refs', '', '</canonical-refs>'].join('\n'),
    );
  });

  it('leaves inline tags or non-tag lines untouched', () => {
    const input = 'before <task> inline </task> after';
    expect(preprocessGsdTags(input)).toBe(input);
  });
});

describe('splitFrontmatter', () => {
  it('returns the body unchanged when there is no frontmatter', () => {
    const r = splitFrontmatter('# hello\n\nworld\n');
    expect(r.yaml).toBeNull();
    expect(r.body).toBe('# hello\n\nworld\n');
    expect(r.frontmatter).toEqual({});
  });

  it('strips a flat frontmatter block and parses keys', () => {
    const text = '---\nphase: 04-cabinet-layout\ntype: discuss\ndecisions: 7\n---\n# Body\n';
    const r = splitFrontmatter(text);
    expect(r.yaml).toContain('phase: 04-cabinet-layout');
    expect(r.body).toBe('# Body\n');
    expect(r.frontmatter.phase).toBe('04-cabinet-layout');
    expect(r.frontmatter.type).toBe('discuss');
    expect(r.frontmatter.decisions).toBe('7');
  });

  it('collapses list values onto one line', () => {
    const text = '---\nstakeholders:\n  - jyj\n  - designer\n---\nbody';
    const r = splitFrontmatter(text);
    expect(r.frontmatter.stakeholders).toBe('jyj designer');
  });
});
