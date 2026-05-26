// Pure helper: turn an absolute path into a URL-scheme launch string.
// Server validates the template at boot and forwards it to the client via
// /api/state; both sides call openInEditor() with the same logic.

export const DEFAULT_TEMPLATE = 'vscode://file/%s';

export type TemplateValidation =
  | { ok: true; template: string }
  | { ok: false; reason: string };

export function validateTemplate(raw: string | undefined): TemplateValidation {
  if (raw === undefined || raw === '') return { ok: true, template: DEFAULT_TEMPLATE };
  if (!raw.includes('%s')) return { ok: false, reason: 'missing %s placeholder' };
  return { ok: true, template: raw };
}

// Percent-encode spaces and non-ASCII while preserving `/` separators —
// editor URL schemes (vscode://file/..., cursor://file/...) need the path
// structure intact, so encoding the whole string with encodeURIComponent
// (which turns `/` into `%2F`) breaks them. Encode each segment instead.
export function encodeAbsPath(absPath: string): string {
  return absPath.split('/').map(encodeURIComponent).join('/');
}

export function openInEditor(absPath: string, template?: string): string {
  const tpl = template && template.includes('%s') ? template : DEFAULT_TEMPLATE;
  return tpl.replace('%s', encodeAbsPath(absPath));
}
