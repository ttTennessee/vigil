import matter from 'gray-matter';

export interface ParsedPlan {
  phase: string;
  plan: string;
  wave: number;
  dependsOn: string[];
  filesModified: string[];
  autonomous: boolean;
  requirements: string[];
}

export function parsePlan(text: string): ParsedPlan {
  let data: Record<string, unknown> = {};
  try {
    data = matter(text).data ?? {};
  } catch {
    data = {};
  }

  const str = (k: string): string => {
    const v = data[k];
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return '';
  };

  const arrStr = (k: string): string[] => {
    const v = data[k];
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string');
  };

  let wave = 1;
  const rawWave = data['wave'];
  if (typeof rawWave === 'number' && Number.isFinite(rawWave)) wave = rawWave;
  else if (typeof rawWave === 'string') {
    const n = Number(rawWave);
    if (Number.isFinite(n)) wave = n;
  }

  let autonomous = true;
  if (typeof data['autonomous'] === 'boolean') autonomous = data['autonomous'];

  return {
    phase: str('phase'),
    plan: str('plan'),
    wave,
    dependsOn: arrStr('depends_on'),
    filesModified: arrStr('files_modified'),
    autonomous,
    requirements: arrStr('requirements'),
  };
}
