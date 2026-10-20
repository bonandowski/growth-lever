import { describe, expect, it } from 'vitest';
import { readState, writeState } from './url';
import { PRESETS, PRESET_KEYS } from './presets';

describe('url state', () => {
  it('with no state, asks for the business type', () => {
    const s = readState('');
    expect(s.onboarding).toBe(true);
    expect(writeState(s)).toBe('');
  });

  it.each(PRESET_KEYS)('a link to %s skips onboarding and loads its numbers', (k) => {
    const s = readState(`?p=${k}`);
    expect(s.onboarding).toBe(false);
    expect(s.type).toBe(k);
    expect(s.inputs).toEqual(PRESETS[k]);
    expect(readState(writeState(s))).toEqual(s);
  });

  it('round-trips custom numbers, business type and the selected lever', () => {
    const s = readState('?p=news&N=50&CAC=900&act=0.6&ARPA=300&r1=0.8&c=0.02&e=0.01&ref=0.01&gm=0.7&leva=c');
    expect(s.onboarding).toBe(false);
    expect(s.preset).toBeNull();
    expect(s.type).toBe('news');
    expect(readState(writeState(s))).toEqual(s);
  });

  it('clamps and ignores bad values', () => {
    const s = readState('?p=b2bSales&r1=3&c=-1&N=abc&leva=nope');
    expect(s.inputs.r1).toBe(1);
    expect(s.inputs.c).toBe(0);
    expect(s.inputs.N).toBe(PRESETS.b2bSales.N);
    expect(s.lever).toBeNull();
  });
});
