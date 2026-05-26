import type { Phase, Plan } from '../../types/state.ts';
import { Chip } from './Chip.js';
import { planGlyph } from './Glyph.js';
import { formatAgo, isStale } from '../lib/relativeTime.js';
import { useNow } from '../lib/useNow.js';

export function planRowId(planId: string): string {
  return `plan-${planId}`;
}

interface PlanRowProps {
  plan: Plan;
  now: number;
  onOpenFailure: (plan: Plan) => void;
}

function PlanRow({ plan, now, onOpenFailure }: PlanRowProps) {
  return (
    <div className={`plan ${plan.status}`} id={planRowId(plan.id)}>
      <span className="glyph">{planGlyph(plan.status)}</span>
      <span className="plan-id">{plan.id}</span>
      <span className="plan-name">{plan.name ?? ''}</span>
      <span className="plan-meta">
        {plan.requirements.length > 0 && (
          <Chip variant="req">[{plan.requirements.join(', ')}]</Chip>
        )}
        {plan.status === 'running' && (
          <Chip variant="amber" stale={isStale(plan.phaseMtime, now)}>
            running · {formatAgo(plan.phaseMtime, now)}
          </Chip>
        )}
        {!plan.autonomous && (
          <Chip variant="human">🪧 human checkpoint</Chip>
        )}
        {plan.status === 'failed' && (
          <Chip variant="failure" onClick={() => onOpenFailure(plan)}>
            self-check failed →
          </Chip>
        )}
        {plan.filesModified.length > 0 && (
          <span className="files-hint">{plan.filesModified.length} files</span>
        )}
      </span>
    </div>
  );
}

interface Props {
  phase: Phase;
  onOpenFailure: (plan: Plan) => void;
}

export function PlansColumn({ phase, onOpenFailure }: Props) {
  const now = useNow();
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
          <div className="wave-label">Wave {w}</div>
          {groups.get(w)!.map((p) => (
            <PlanRow key={p.id} plan={p} now={now} onOpenFailure={onOpenFailure} />
          ))}
        </div>
      ))}
    </main>
  );
}
