import { useState } from 'react';
import type { Phase, StageArtifact, StageName } from '../../types/state.ts';
import { stageGlyph } from './Glyph.js';

interface Props {
  phase: Phase;
  selectedStage: StageName;
  selectedPath: string | null;
  onSelect: (stage: StageName, path: string | null) => void;
}

export function StagesColumn({ phase, selectedStage, selectedPath, onSelect }: Props) {
  // Expansion is local to this column — clicking the parent of a multi-artifact
  // stage only opens/closes its sub-items; it does NOT change the main view.
  const [expandedStages, setExpandedStages] = useState<Set<StageName>>(new Set());

  return (
    <aside className="stages">
      <div className="stages-label">Stages</div>
      {phase.stages.map((s) => {
        const isSelected = s.name === selectedStage;
        const isExecute = s.name === 'execute';
        const artifacts: StageArtifact[] = s.artifacts;
        const hasMany = artifacts.length > 1;
        const clickable = isExecute || artifacts.length > 0;
        const expanded = hasMany && expandedStages.has(s.name);

        const toggleExpand = () => {
          setExpandedStages((prev) => {
            const next = new Set(prev);
            if (next.has(s.name)) next.delete(s.name);
            else next.add(s.name);
            return next;
          });
        };

        const handleRowSelect = () => {
          if (isExecute) {
            onSelect('execute', null);
            return;
          }
          if (artifacts.length === 1) {
            onSelect(s.name, artifacts[0]!.path);
          } else if (hasMany) {
            toggleExpand();
          }
        };

        const caret = hasMany ? (expanded ? '▾' : '▸') : '';

        return (
          <div key={s.name} className="stage-group">
            <div
              className={`stage ${s.status}${isSelected ? ' selected' : ''}${clickable ? ' clickable' : ''}`}
              onClick={clickable ? handleRowSelect : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : -1}
              onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleRowSelect();
                }
              }}
            >
              <span className="glyph">{stageGlyph(s.status)}</span>
              <span className="stage-name">{s.name}</span>
              {hasMany && <span className="stage-caret">{caret}</span>}
            </div>
            {expanded && artifacts.map((art) => {
              const subSelected = selectedPath === art.path;
              return (
                <div
                  key={art.path}
                  className={`stage-sub${subSelected ? ' selected' : ''}`}
                  onClick={() => onSelect(s.name, art.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(s.name, art.path);
                    }
                  }}
                >
                  {art.label}
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
