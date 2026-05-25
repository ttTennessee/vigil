import { useEffect, useState } from 'react';
import { preprocessGsdTags, splitFrontmatter, truncateMarkdown } from '../../parsers/markdown.js';
import { FrontmatterCard } from './FrontmatterCard.js';
import { MarkdownRender } from './MarkdownRender.js';

interface Props {
  artifactPath: string; // relative to .planning/
}

type Fetch =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; text: string };

export function ArtifactDrawer({ artifactPath }: Props) {
  const [fetchState, setFetchState] = useState<Fetch>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setFetchState({ kind: 'loading' });
    fetch(`/api/artifact?path=${encodeURIComponent(artifactPath)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setFetchState({ kind: 'ready', text });
      })
      .catch((err: unknown) => {
        if (!cancelled) setFetchState({ kind: 'error', message: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [artifactPath]);

  const title = artifactPath.split('/').pop() ?? artifactPath;

  if (fetchState.kind === 'loading') {
    return (
      <div className="drawer">
        <div className="drawer-head">
          <span className="drawer-title">{title}</span>
        </div>
        <div className="drawer-empty">loading…</div>
      </div>
    );
  }
  if (fetchState.kind === 'error') {
    return (
      <div className="drawer">
        <div className="drawer-head">
          <span className="drawer-title">{title}</span>
        </div>
        <div className="drawer-empty">could not load artifact — {fetchState.message}</div>
      </div>
    );
  }

  const { frontmatter, body: bodyAfterFm } = splitFrontmatter(fetchState.text);
  const prepared = preprocessGsdTags(bodyAfterFm);
  const { body, truncated, shownLines, totalLines } = truncateMarkdown(prepared);

  return (
    <div className="drawer">
      <div className="drawer-head">
        <span className="drawer-title">{title}</span>
        <span className="drawer-meta">{totalLines} lines</span>
      </div>
      <FrontmatterCard frontmatter={frontmatter} />
      <MarkdownRender body={body} />
      {truncated && (
        <div className="drawer-footer">
          <span className="truncated">
            showing first {shownLines} lines of {totalLines}
          </span>
          <span>
            <a
              href="#"
              className="open-editor"
              onClick={(e) => {
                e.preventDefault();
                // Stub for issue #7.
                console.log('[vigil] open-in-editor', artifactPath);
              }}
            >
              open in editor →
            </a>
          </span>
        </div>
      )}
    </div>
  );
}
