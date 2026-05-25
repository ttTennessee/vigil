import type { ReactNode } from 'react';

type Variant = 'neutral' | 'req';

export function Chip({ variant = 'neutral', children }: { variant?: Variant; children: ReactNode }) {
  return <span className={`chip ${variant === 'req' ? 'req' : ''}`}>{children}</span>;
}
