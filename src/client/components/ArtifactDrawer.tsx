import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { preprocessGsdTags, splitFrontmatter, truncateMarkdown } from '../../parsers/markdown.js';
import { openInEditor } from '../../parsers/openInEditor.js';
import { FrontmatterCard } from './FrontmatterCard.js';
import { MarkdownRender } from './MarkdownRender.js';
import { CopyPathButton } from './CopyPathButton.js';

interface Props {
  artifactPath: string;        // relative to .planning/
  planningDir: string;         // absolute path of .planning/
  projectPath: string;         // absolute project root (for @file/path refs)
  openUrlTemplate?: string;
  scrollToSlugs?: string[];    // first slug matching a heading id wins
}

type Fetch =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; text: string };

export function ArtifactDrawer({
  artifactPath,
  planningDir,
  projectPath,
  openUrlTemplate,
  scrollToSlugs,
}: Props) {
  const [fetchState, setFetchState] = useState<Fetch>({ kind: 'loading' });
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // After the markdown body renders, scroll to the first matching heading.
  // useLayoutEffect avoids a visible jump between "drawer top" and the
  // target position.
  useLayoutEffect(() => {
    if (fetchState.kind !== 'ready') return;
    if (!scrollToSlugs?.length) return;
    const container = containerRef.current;
    if (!container) return;
    for (const slug of scrollToSlugs) {
      const target = container.querySelector(`#${CSS.escape(slug)}`);
      if (target) {
        (target as HTMLElement).scrollIntoView({ block: 'start' });
        return;
      }
    }
  }, [fetchState, scrollToSlugs]);

  const title = artifactPath.split('/').pop() ?? artifactPath;
  const absPath = `${planningDir.replace(/\/$/, '')}/${artifactPath}`;
  const editorHref = openInEditor(absPath, openUrlTemplate);

  if (fetchState.kind === 'loading') {
    return (
      <div className="drawer" ref={containerRef}>
        <div className="drawer-head">
          <span className="drawer-title">{title}</span>
        </div>
        <div className="drawer-empty">loading…</div>
      </div>
    );
  }
  if (fetchState.kind === 'error') {
    return (
      <div className="drawer" ref={containerRef}>
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
    <div className="drawer" ref={containerRef}>
      <div className="drawer-head">
        <span className="drawer-title">{title}</span>
        <span className="drawer-meta">{totalLines} lines</span>
      </div>
      <FrontmatterCard frontmatter={frontmatter} />
      <MarkdownRender
        body={body}
        resolveRoot={projectPath}
        openUrlTemplate={openUrlTemplate}
      />
      <div className="drawer-footer">
        <span className="truncated">
          {truncated ? `showing first ${shownLines} lines of ${totalLines}` : ''}
        </span>
        <span className="drawer-footer-actions">
          <a href={editorHref} className="open-editor">
            open in editor →
          </a>
          <CopyPathButton absPath={absPath} variant="footer" />
        </span>
      </div>
    </div>
  );
}
