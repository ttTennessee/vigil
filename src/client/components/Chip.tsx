import type { MouseEventHandler, ReactNode } from 'react';

type Variant = 'neutral' | 'req' | 'amber' | 'human' | 'failure';

interface Props {
  variant?: Variant;
  stale?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  children: ReactNode;
}

export function Chip({ variant = 'neutral', stale, onClick, title, children }: Props) {
  const classes = ['chip'];
  if (variant !== 'neutral') classes.push(variant);
  if (stale) classes.push('stale');
  if (onClick) {
    return (
      <button type="button" className={classes.join(' ')} onClick={onClick} title={title}>
        {children}
      </button>
    );
  }
  return <span className={classes.join(' ')} title={title}>{children}</span>;
}
