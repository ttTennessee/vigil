// Header-anchor slugifier matching GitHub's lowercase + hyphenate behavior
// closely enough for our use (heading lookup in SUMMARY artifacts). React
// children may include strings or further elements — we walk the tree and
// concatenate text.
import type { ReactNode } from 'react';

export function nodeText(children: ReactNode): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(nodeText).join('');
  if (typeof children === 'object' && 'props' in children) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    return nodeText(props?.children);
  }
  return '';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
