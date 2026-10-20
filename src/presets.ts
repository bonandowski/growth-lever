import type { Inputs } from './model';

// Invented, round numbers. They describe no real company.
export const PRESETS = {
  smb: { N: 400, CAC: 120, act: 0.4, ARPA: 49, r1: 0.7, c: 0.04, e: 0.01, ref: 0.03, gm: 0.8 },
  b2b: { N: 20, CAC: 3000, act: 0.3, ARPA: 1500, r1: 0.9, c: 0.015, e: 0.015, ref: 0.01, gm: 0.8 },
  welfare: { N: 30, CAC: 1500, act: 0.5, ARPA: 600, r1: 0.85, c: 0.02, e: 0.02, ref: 0.015, gm: 0.65 },
} satisfies Record<string, Inputs>;

export type PresetKey = keyof typeof PRESETS;
export const DEFAULT_PRESET: PresetKey = 'smb';
