import { LEVERS, LIMITS, type Inputs, type Lever } from './model';
import { DEFAULT_PRESET, PRESETS, type PresetKey } from './presets';

export interface AppState {
  onboarding: boolean; // no state in the URL: ask the business type first
  type: PresetKey; // business type: labels, sources and starting numbers
  preset: PresetKey | null; // null = custom numbers
  inputs: Inputs;
  lever: Lever | null;
}

const KEYS: (keyof Omit<Inputs, 'boost'>)[] = ['N', 'CAC', 'act', 'ARPA', 'r1', 'c', 'e', 'ref', 'gm'];
const MAX: Record<string, number> = { N: 1e7, CAC: 1e5, ARPA: 1e5, ...LIMITS };

export function sanitize(p: Inputs): Inputs {
  const out = { ...p };
  for (const k of KEYS) {
    const v = Number(out[k]);
    out[k] = Number.isFinite(v) ? Math.min(MAX[k], Math.max(0, v)) : 0;
  }
  delete out.boost;
  return out;
}

export function readState(search: string): AppState {
  const q = new URLSearchParams(search);
  const presetParam = q.get('p') as PresetKey | null;
  const preset = presetParam && presetParam in PRESETS ? presetParam : null;
  const base: Inputs = { ...PRESETS[preset ?? DEFAULT_PRESET] };
  let custom = false;
  for (const k of KEYS) {
    const raw = q.get(k);
    if (raw !== null && raw !== '' && Number.isFinite(Number(raw))) {
      base[k] = Number(raw);
      custom = true;
    }
  }
  const leverParam = q.get('leva') as Lever | null;
  return {
    onboarding: !preset && !custom,
    type: preset ?? DEFAULT_PRESET,
    preset: custom ? null : (preset ?? DEFAULT_PRESET),
    inputs: sanitize(base),
    lever: leverParam && LEVERS.includes(leverParam) ? leverParam : null,
  };
}

export function writeState(s: AppState): string {
  if (s.onboarding) return '';
  const q = new URLSearchParams();
  q.set('p', s.preset ?? s.type);
  if (!s.preset) for (const k of KEYS) q.set(k, String(+s.inputs[k].toPrecision(6)));
  if (s.lever) q.set('leva', s.lever);
  return `?${q.toString()}`;
}
