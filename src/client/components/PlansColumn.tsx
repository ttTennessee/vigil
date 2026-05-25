import type { Phase, Plan } from '../../types/state.ts';
import { Chip } from './Chip.js';
import { planGlyph } from './Glyph.js';

function WaveLabel({ wave }: { wave: number }) {
  return <div className="wave-label">Wave {wave}</div>;
}

function PlanRow({ plan }: { plan: Plan }) {
  return (
    <div className={`plan ${plan.status}`}>
      <span className="glyph">{planGlyph(plan.status)}</span>
      <span className="plan-id">{plan.id}</span>
      <span className="plan-name">{plan.name ?? ''}</span>
      <span className="plan-meta">
        {plan.requirements.length > 0 && (
          <Chip variant="req">[{plan.requirements.join(', ')}]</Chip>
        )}
        {plan.filesModified.length > 0 && (
          <span className="files-hint">{plan.filesModified.length} files</span>
        )}
      </span>
    </div>
  );
}

export function PlansColumn({ phase }: { phase: Phase }) {
  const groups = new Map<number, Plan[]>();
  for (const p of phase.plans) {
    if (!groups.has(p.wave)) groups.set(p.wave, []);
    groups.get(p.wave)!.push(p);
  }
  const waves = [...groups.keys()].sort((a, b) => a - b);

  return (
    <main className="main">
      {waves.map((w) => (
        <div key={w}>
          <WaveLabel wave={w} />
          {groups.get(w)!.map((p) => <PlanRow key={p.id} plan={p} />)}
        </div>
      ))}
    </main>
  );
}
