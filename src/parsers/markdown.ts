// Pure markdown utilities shared by client and (potentially) server.
// No fs / node imports — runs in browser bundles too.

export interface TruncatedMarkdown {
  body: string;
  truncated: boolean;
  shownLines: number;
  totalLines: number;
}

const MAX_LINES = 500;
const MAX_CHARS = 8000;

// GSD custom XML tags whose contents are markdown. Two CommonMark
// constraints conspire here:
//   1. The HTML-block tag-name rule is `letter (letter|digit|-)*` — no
//      underscores. `<canonical_refs>` falls through to paragraph text.
//   2. Even with valid names, `<tag>...</tag>` without surrounding blank
//      lines is treated as one inert HTML block — `## Heading` inside
//      renders as literal text instead of a markdown heading.
// preprocessGsdTags fixes both: rewrites snake_case tag names to kebab-case
// (rehype-raw still re-parses them as HTML elements; sanitize and the
// components map key on the rewritten form), and inserts blank lines around
// each bare tag line so the inner body re-enters the markdown parser.
const GSD_TAG_LINE_RE = /^\s*<\/?[a-z][a-z0-9_-]*>\s*$/;
const GSD_TAG_RENAME_RE = /<(\/?)([a-z][a-z0-9_]*)>/g;

export function gsdTagToHtml(tag: string): string {
  return tag.replace(/_/g, '-');
}

export function preprocessGsdTags(text: string): string {
  // Rewrite all `<snake_case>` / `</snake_case>` to `<snake-case>` so
  // commonmark accepts them as HTML.
  const renamed = text.replace(GSD_TAG_RENAME_RE, (_m, slash: string, name: string) => {
    return `<${slash}${gsdTagToHtml(name)}>`;
  });

  const lines = renamed.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const isTagLine = GSD_TAG_LINE_RE.test(line);
    if (isTagLine && out.length > 0 && out[out.length - 1]!.trim() !== '') {
      out.push('');
    }
    out.push(line);
    if (isTagLine) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() !== '') {
        out.push('');
      }
    }
  }
  return out.join('\n');
}

/**
 * Cap markdown at 500 lines OR 8000 chars (whichever hits first), cut at the
 * next newline boundary. See PRD §Testing-Decisions item 8.
 */
export function truncateMarkdown(text: string): TruncatedMarkdown {
  const lines = text.split('\n');
  const totalLines = lines.length;

  // Find the line-index just past MAX_CHARS (cut at next newline).
  let charCapLineIdx = -1;
  let running = 0;
  for (let i = 0; i < lines.length; i++) {
    running += lines[i]!.length + 1; // +1 for the '\n'
    if (running > MAX_CHARS) {
      charCapLineIdx = i; // include this line, then stop
      break;
    }
  }

  const lineCapHits = totalLines > MAX_LINES;
  const charCapHits = charCapLineIdx !== -1;

  if (!lineCapHits && !charCapHits) {
    return { body: text, truncated: false, shownLines: totalLines, totalLines };
  }

  let shownLines: number;
  if (lineCapHits && charCapHits) {
    shownLines = Math.min(MAX_LINES, charCapLineIdx + 1);
  } else if (lineCapHits) {
    shownLines = MAX_LINES;
  } else {
    shownLines = charCapLineIdx + 1;
  }

  const body = lines.slice(0, shownLines).join('\n');
  return { body, truncated: true, shownLines, totalLines };
}

export interface SplitFrontmatter {
  yaml: string | null;       // raw text between the --- fences, or null
  body: string;              // markdown body with the fenced block stripped
  frontmatter: Record<string, string>; // shallow key/value parse for the card
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Splits leading YAML frontmatter (`---\n...\n---`) from a markdown string.
 * Returns the raw yaml chunk, the remaining body, and a shallow key/value map
 * — sufficient for FrontmatterCard's flat grid. Values that span multiple
 * lines (block lists / nested maps) collapse to a single trimmed string.
 */
export function splitFrontmatter(text: string): SplitFrontmatter {
  const m = FM_RE.exec(text);
  if (!m) {
    return { yaml: null, body: text, frontmatter: {} };
  }
  const yaml = m[1] ?? '';
  const body = text.slice(m[0].length);
  const frontmatter: Record<string, string> = {};

  let currentKey: string | null = null;
  let buffered: string[] = [];
  const flush = () => {
    if (currentKey) {
      const v = buffered.join(' ').trim();
      frontmatter[currentKey] = v;
    }
    currentKey = null;
    buffered = [];
  };

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) continue;
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    const isContinuation = /^\s+/.test(rawLine);
    if (kv && !isContinuation) {
      flush();
      currentKey = kv[1]!;
      const initial = kv[2]!.trim();
      if (initial) buffered.push(initial);
    } else if (currentKey) {
      buffered.push(line.trim().replace(/^-\s*/, ''));
    }
  }
  flush();

  return { yaml, body, frontmatter };
}
