import { describe, expect, it } from 'vitest';
import { readState, writeState } from './url';
import { PRESETS } from './presets';

describe('url state', () => {
  it('defaults to the SMB preset', () => {
    const s = readState('');
    expect(s.preset).toBe('smb');
    expect(s.inputs).toEqual(PRESETS.smb);
    expect(s.lever).toBeNull();
  });

  it('round-trips custom numbers and the selected lever', () => {
    const s = readState('?N=50&CAC=900&act=0.6&ARPA=300&r1=0.8&c=0.02&e=0.01&ref=0.01&gm=0.7&leva=c');
    expect(s.preset).toBeNull();
    expect(readState(writeState(s))).toEqual(s);
  });

  it('clamps and ignores bad values', () => {
    const s = readState('?p=b2b&r1=3&c=-1&N=abc&leva=nope');
    expect(s.inputs.r1).toBe(1);
    expect(s.inputs.c).toBe(0);
    expect(s.inputs.N).toBe(PRESETS.b2b.N);
    expect(s.lever).toBeNull();
  });
});
