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

// Path-ish characters: letters, digits, slash, dot, dash, underscore.
// Stops at whitespace, common punctuation, end-of-string.
const FILE_RE = /@([A-Za-z0-9._/-]+)/g;

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
    const path = m[1]!;
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    out.push({
      type: 'link',
      url: '',
      children: [{ type: 'text', value: `@${path}` }],
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
