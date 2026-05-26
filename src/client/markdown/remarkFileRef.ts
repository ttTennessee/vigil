// Remark plugin: detect `@file/path` text spans inside markdown text nodes
// and replace them with anchor-like nodes the renderer can intercept.
//
// We emit a `link`-ish mdast node carrying hast hints — hName=a,
// hProperties.className=['file-ref'], hProperties['data-path']=path,
// and a custom `vigil-file:` href. The rehype-sanitize schema in
// MarkdownRender whitelists this protocol; ReactMarkdown's `a` component
// override turns the href into a click handler.

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  url?: string;
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

// Two forms:
//   1. Bare:     @some/path/file.md   — stops at whitespace or sentence
//                punctuation. Path-ish chars include unicode letters and
//                digits (\p{L}\p{N}) so paths like `@.planning/中文.md`
//                match end-to-end.
//   2. Bracketed: @<some/path with spaces.md> — used when the path embeds
//                spaces, parens, or other punctuation that would otherwise
//                terminate the bare form. The brackets are stripped from
//                the captured path; only what's inside reaches the editor.
//
// The bracketed alternation comes first so `@<x>` doesn't get half-matched
// by the bare branch.
const FILE_RE = /@<([^>\n]+)>|@([\p{L}\p{N}._/-]+)/gu;

export default function remarkFileRef() {
  return (tree: MdNode) => {
    walk(tree);
  };
}

function walk(node: MdNode): void {
  const children = node.children;
  if (!children) return;
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    if (child.type === 'text' && typeof child.value === 'string' && child.value.includes('@')) {
      const replacements = splitText(child.value);
      if (replacements) {
        children.splice(i, 1, ...replacements);
        i += replacements.length - 1;
        continue;
      }
    }
    walk(child);
  }
}

function splitText(text: string): MdNode[] | null {
  const out: MdNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  FILE_RE.lastIndex = 0;
  let matched = false;
  while ((m = FILE_RE.exec(text))) {
    matched = true;
    const start = m.index;
    // Group 1: bracketed form (path inside `@<...>`); group 2: bare form.
    const path = (m[1] ?? m[2])!;
    // Label preserves the original surface form so readers see what they
    // typed — bracketed paths render with the angle brackets intact.
    const label = m[1] !== undefined ? `@<${path}>` : `@${path}`;
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    out.push({
      type: 'link',
      url: '',
      children: [{ type: 'text', value: label }],
      data: {
        // Custom element name (must contain a hyphen so React + parse5
        // accept it as a custom element rather than a typo'd anchor).
        // Sanitize schema whitelists this tag + dataPath; MarkdownRender's
        // components map keys on 'file-ref' to attach the click handler.
        hName: 'file-ref',
        hProperties: {
          className: ['file-ref'],
          dataPath: path,
        },
      },
    });
    last = start + m[0].length;
  }
  if (!matched) return null;
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}
