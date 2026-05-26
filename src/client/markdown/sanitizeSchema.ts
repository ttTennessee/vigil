import { defaultSchema } from 'rehype-sanitize';

// Extend default sanitize schema:
//  - allow GSD custom XML tags (rendered as callouts)
//  - allow `className` and `data-path` everywhere so file-ref spans survive
//  - allow the custom `vigil-file:` protocol on href
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // GSD custom XML observed in real .planning/ fixtures. CommonMark's
    // tag-name grammar disallows underscores, so preprocessGsdTags rewrites
    // them to kebab-case before parsing — the names listed here therefore
    // use hyphens.
    // Spec callouts (issue #5):
    'task', 'objective', 'execution-context', 'acceptance-criteria', 'verify', 'context',
    // Section wrappers used by GSD discuss/plan artifacts:
    'domain', 'decisions', 'specifics', 'canonical-refs', 'code-context',
    'deferred', 'phase-requirements', 'read-first', 'success-criteria',
    'tasks', 'threat-model', 'user-constraints', 'verification',
    // Misc structural / leaf tags GSD emits inside section wrappers:
    'action', 'automated', 'done', 'feature', 'files', 'interfaces',
    'name', 'number', 'uuid', 'unknown',
    // Vigil's own clickable @file/path span, emitted by remarkFileRef.
    'file-ref',
  ],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className',
      'class',
      'dataPath',
      'data-path',
      'id',
    ],
    'file-ref': ['className', 'dataPath'],
  },
  protocols: {
    ...(defaultSchema.protocols ?? {}),
    href: [
      ...((defaultSchema.protocols?.href as string[]) ?? []),
      'vigil-file',
    ],
  },
};
