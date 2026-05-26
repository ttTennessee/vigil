import { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkFileRef from '../markdown/remarkFileRef.js';
import { sanitizeSchema } from '../markdown/sanitizeSchema.js';
import { nodeText, slugify } from '../lib/slug.js';

interface Props {
  body: string;
}

type ChildProps = { children?: React.ReactNode };

function Callout({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="task-callout">
      <div className="task-name">{label}</div>
      {children}
    </div>
  );
}

// Keys match the kebab-case form produced by preprocessGsdTags — react
// requires custom element names to contain a hyphen (or look standard) to
// render without warnings, and CommonMark disallows underscores in HTML
// tag names anyway.
const calloutLabels: Record<string, string> = {
  task: 'Task',
  objective: 'Objective',
  'execution-context': 'Execution context',
  'acceptance-criteria': 'Acceptance criteria',
  verify: 'Verify',
  context: 'Context',
};

export function MarkdownRender({ body }: Props) {
  const onFileClick = useCallback((path: string) => {
    // Stub for issue #7: real action will open the file in the user's editor.
    console.log('[vigil] file-ref click', path);
  }, []);

  // react-markdown's `components` prop is loosely typed — cast to any per
  // upstream guidance for custom tag mappings.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const components: any = {
    h2: ({ children }: ChildProps) => (
      <h2 id={slugify(nodeText(children))}>{children}</h2>
    ),
    h3: ({ children }: ChildProps) => (
      <h3 id={slugify(nodeText(children))}>{children}</h3>
    ),
    'file-ref': (props: { dataPath?: string; 'data-path'?: string; children?: React.ReactNode }) => {
      const path = props.dataPath ?? props['data-path'] ?? '';
      return (
        <span
          className="file-ref"
          role="link"
          tabIndex={0}
          onClick={() => onFileClick(path)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onFileClick(path);
            }
          }}
        >
          {props.children}
        </span>
      );
    },
  };
  for (const [tag, label] of Object.entries(calloutLabels)) {
    components[tag] = ({ children }: ChildProps) => <Callout label={label}>{children}</Callout>;
  }
  // GSD section wrappers: render as labelled blocks so their tag identity
  // stays visible without dominating like the amber callouts. Anything new
  // GSD adds also lands here as long as sanitizeSchema whitelists it.
  const sectionTags = [
    'domain', 'decisions', 'specifics', 'canonical-refs', 'code-context',
    'deferred', 'phase-requirements', 'read-first', 'success-criteria',
    'tasks', 'threat-model', 'user-constraints', 'verification',
    'action', 'automated', 'done', 'feature', 'files', 'interfaces',
    'name', 'number', 'uuid', 'unknown',
  ];
  for (const tag of sectionTags) {
    components[tag] = ({ children }: ChildProps) => (
      <section className="gsd-section" data-tag={tag}>
        <div className="gsd-section-label">{tag.replace(/-/g, ' ')}</div>
        {children}
      </section>
    );
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFileRef]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
