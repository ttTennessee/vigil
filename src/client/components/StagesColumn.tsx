import type { Phase, StageName } from '../../types/state.ts';
import { stageGlyph } from './Glyph.js';

interface Props {
  phase: Phase;
  selected: StageName;
  onSelect: (name: StageName) => void;
}

export function StagesColumn({ phase, selected, onSelect }: Props) {
  return (
    <aside className="stages">
      <div className="stages-label">Stages</div>
      {phase.stages.map((s) => {
        const isSelected = s.name === selected;
        const isExecute = s.name === 'execute';
        const clickable = isExecute || !!s.artifactPath;
        return (
          <div
            key={s.name}
            className={`stage ${s.status}${isSelected ? ' selected' : ''}${clickable ? ' clickable' : ''}`}
            onClick={clickable ? () => onSelect(s.name) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : -1}
            onKeyDown={(e) => {
              if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(s.name);
              }
            }}
          >
            <span className="glyph">{stageGlyph(s.status)}</span>
            {s.name}
          </div>
        );
      })}
    </aside>
  );
}
