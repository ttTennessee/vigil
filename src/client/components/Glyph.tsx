import type { PlanStatus, StageStatus } from '../../types/state.ts';

export function planGlyph(status: PlanStatus): string {
  switch (status) {
    case 'done':    return '✓';
    case 'running': return '◐';
    case 'failed':  return '✗';
    case 'pending': return '○';
  }
}

export function stageGlyph(status: StageStatus): string {
  switch (status) {
    case 'done':    return '✓';
    case 'current': return '●';
    case 'pending': return '○';
  }
}
