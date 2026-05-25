import type { Phase } from '../../types/state.ts';
import { stageGlyph } from './Glyph.js';

export function StagesColumn({ phase }: { phase: Phase }) {
  return (
    <aside className="stages">
      <div className="stages-label">Stages</div>
      {phase.stages.map((s) => (
        <div key={s.name} className={`stage ${s.status}`}>
          <span className="glyph">{stageGlyph(s.status)}</span>
          {s.name}
        </div>
      ))}
    </aside>
  );
}
