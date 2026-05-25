interface Props {
  frontmatter: Record<string, string>;
}

export function FrontmatterCard({ frontmatter }: Props) {
  const entries = Object.entries(frontmatter);
  if (entries.length === 0) return null;
  return (
    <div className="frontmatter-card">
      <div className="fm-label">Frontmatter</div>
      <div className="fm-grid">
        {entries.map(([k, v]) => (
          <FmRow key={k} k={k} v={v} />
        ))}
      </div>
    </div>
  );
}

function FmRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="fm-key">{k}</span>
      <span className="fm-val">{v}</span>
    </>
  );
}
