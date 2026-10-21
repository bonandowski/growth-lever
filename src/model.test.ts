import { describe, expect, it } from 'vitest';
import {
  HORIZON,
  LEVERS,
  equalGainPlan,
  equivalentPush,
  ltvToCac,
  nrr12,
  insight,
  leverImpacts,
  objective,
  paybackMonth,
  pushLever,
  simulate,
  survival,
  type Inputs,
} from './model';
import { PRESETS } from './presets';

const base: Inputs = PRESETS.b2bPlg;

describe('survival', () => {
  it('starts at 1, drops to r1, then decays by churn', () => {
    expect(survival(0, 0.7, 0.04)).toBe(1);
    expect(survival(1, 0.7, 0.04)).toBe(0.7);
    expect(survival(3, 0.7, 0.04)).toBeCloseTo(0.7 * 0.96 * 0.96);
  });
});

describe('simulate', () => {
  it('produces one point per month', () => {
    const r = simulate(base);
    expect(r.series).toHaveLength(HORIZON);
    expect(r.mrr24).toBe(r.series[23].mrr);
  });

  it('with no users there is nothing: no revenue, no cost', () => {
    const r = simulate({ ...base, N: 0 });
    expect(r.mrr24).toBe(0);
    expect(r.cumulative).toBe(0);
    expect(r.value).toBe(0);
  });

  it('with c = 0 and r1 = 1 and no upsell or referral, MRR grows linearly', () => {
    const p = { ...base, c: 0, r1: 1, e: 0, ref: 0 };
    const r = simulate(p);
    const perMonth = p.N * p.act * p.ARPA;
    r.series.forEach((s) => expect(s.mrr).toBeCloseTo(perMonth * s.month));
  });

  it('cohort layers add up to MRR', () => {
    const r = simulate(base);
    for (let t = 0; t < HORIZON; t++) {
      const sum = r.cohortMrr.reduce((acc, row) => acc + row[t], 0);
      expect(sum).toBeCloseTo(r.series[t].mrr);
    }
  });

  it('referrals bring free users, so they never add cost', () => {
    const withRef = simulate({ ...base, ref: 0.05 });
    const without = simulate({ ...base, ref: 0 });
    expect(withRef.series[23].cost).toBe(without.series[23].cost);
    expect(withRef.mrr24).toBeGreaterThan(without.mrr24);
  });

  it('a huge CAC makes value created negative', () => {
    expect(simulate({ ...base, CAC: 1e7 }).value).toBeLessThan(0);
  });
});

describe('payback', () => {
  it('is null when a customer never earns back acquisition within the horizon', () => {
    expect(paybackMonth({ ...base, CAC: 1e6 })).toBeNull();
    expect(paybackMonth({ ...base, act: 0 })).toBeNull();
  });

  it('accounts for activation: paying customers cost CAC / act', () => {
    const p = { ...base, r1: 1, c: 0, e: 0, CAC: 100, act: 0.5, ARPA: 50, gm: 1 };
    expect(paybackMonth(p)).toBe(4); // 200 € to recover at 50 € per month
  });
});

describe('levers', () => {
  it.each(LEVERS)('pushing %s in its favourable direction never lowers value (except acquisition)', (lever) => {
    if (lever === 'N') return;
    const before = objective(base);
    expect(objective(pushLever(base, lever, 0.1))).toBeGreaterThanOrEqual(before);
    expect(objective(pushLever(base, lever, 0.2))).toBeGreaterThanOrEqual(objective(pushLever(base, lever, 0.1)));
  });

  it('respects bounds', () => {
    expect(pushLever({ ...base, r1: 0.95 }, 'r1', 0.1).r1).toBe(1);
    expect(pushLever({ ...base, act: 0.99 }, 'act', 0.1).act).toBe(1);
    expect(pushLever({ ...base, e: 0.095 }, 'e', 0.1).e).toBe(0.1);
    expect(pushLever(base, 'CAC', 2).CAC).toBe(0);
  });

  it('extra paid users activate less than current ones', () => {
    const pushed = simulate(pushLever(base, 'N', 0.1));
    const proportional = simulate({ ...base, N: base.N * 1.1 });
    expect(pushed.mrr24).toBeLessThan(proportional.mrr24);
  });

  it('a lever at its bound has zero impact and is flagged', () => {
    const impacts = leverImpacts({ ...base, r1: 1 });
    const r1 = impacts.find((i) => i.lever === 'r1')!;
    expect(r1.delta).toBe(0);
    expect(r1.capped).toBe(true);
  });

  it('impacts are sorted from strongest to weakest', () => {
    const d = leverImpacts(base).map((i) => i.delta);
    expect([...d].sort((a, b) => b - a)).toEqual(d);
  });
});

describe('equivalentPush (bisection)', () => {
  it('finds the push that matches a target gain', () => {
    const gain = objective(pushLever(base, 'r1', 0.1)) - objective(base);
    const x = equivalentPush(base, 'CAC', gain)!;
    expect(x).toBeGreaterThan(0);
    expect(objective(pushLever(base, 'CAC', x)) - objective(base)).toBeCloseTo(gain, 0);
  });

  it('returns null when the lever cannot reach the gain', () => {
    expect(equivalentPush(base, 'CAC', 1e12)).toBeNull();
    expect(equivalentPush({ ...base, r1: 1 }, 'r1', 1)).toBeNull();
  });
});

describe('insight', () => {
  it('on the example numbers, retention or activation beat acquisition', () => {
    const top = leverImpacts(base)[0].lever;
    expect(['act', 'r1', 'c']).toContain(top);
    const i = insight(base);
    expect(i.kind).toBe('equivalent');
  });

  it('is empty when nothing can grow', () => {
    expect(insight({ ...base, N: 0, ref: 0 }).kind).toBe('empty');
  });

  it('flags acquisition that destroys value', () => {
    const i = insight({ ...base, CAC: 5000 });
    expect(i.kind).toBe('acquisitionHurts');
  });
});

describe('business presets', () => {
  it.each(Object.entries(PRESETS))('%s stays within bounds and produces revenue', (_, p) => {
    const r = simulate(p);
    expect(r.mrr24).toBeGreaterThan(0);
    expect(p.act).toBeLessThanOrEqual(1);
    expect(p.r1).toBeLessThanOrEqual(1);
    expect(p.e).toBeLessThanOrEqual(0.1);
    expect(p.ref).toBeLessThanOrEqual(0.1);
    expect(Number.isFinite(r.value)).toBe(true);
  });
});

describe('equalGainPlan', () => {
  it.each(Object.entries(PRESETS))('%s: every reachable lever hits the same target', (_, p) => {
    const plan = equalGainPlan(p);
    const before = objective(p);
    expect(plan.target).toBeGreaterThan(0);
    for (const row of plan.rows) {
      if (row.x === null || row.harmful) continue;
      const gain = objective(pushLever(p, row.lever, row.x)) - before;
      expect(Math.abs(gain - plan.target) / plan.target).toBeLessThan(0.001);
    }
  });

  it('the strongest lever needs exactly the reference 10%', () => {
    const plan = equalGainPlan(base);
    expect(Math.min(...plan.rows.filter((r) => r.x !== null).map((r) => r.x!))).toBeCloseTo(0.1, 4);
  });

  it('flags levers that cannot get there alone and levers that destroy value', () => {
    const capped = equalGainPlan({ ...base, r1: 1 }).rows.find((r) => r.lever === 'r1')!;
    expect(capped.x).toBeNull();
    const hurt = equalGainPlan({ ...base, CAC: 5000 }).rows.find((r) => r.lever === 'N')!;
    expect(hurt.harmful).toBe(true);
  });

  it('is empty when nothing can grow', () => {
    expect(equalGainPlan({ ...base, N: 0, ref: 0 }).target).toBe(0);
  });
});

describe('unit economics', () => {
  it('LTV/CAC uses the cost of a paying customer', () => {
    const p = { ...base, r1: 1, c: 0, e: 0, ARPA: 10, gm: 1, CAC: 60, act: 0.5 };
    expect(ltvToCac(p)).toBeCloseTo((10 * 60) / 120); // 60 months of €10 over €120
    expect(ltvToCac({ ...base, CAC: 0 })).toBeNull();
  });

  it('NRR combines churn and expansion over a year', () => {
    expect(nrr12({ ...base, c: 0, e: 0 })).toBe(1);
    expect(nrr12({ ...base, c: 0.01, e: 0.015 })).toBeGreaterThan(1);
  });
});
