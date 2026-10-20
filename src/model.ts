// Pure growth model for a subscription product. No DOM, no React.
//
// Time convention: months m = 1..H. Each month a new cohort of N customers is
// acquired; a cohort acquired in month k has age m - k in month m (age 0 in the
// month it signs up). MRR(m) is the revenue billed in month m.

export interface Inputs {
  N: number; // new customers per month
  CAC: number; // acquisition cost per customer (€)
  ARPA: number; // average monthly revenue per customer (€)
  r1: number; // retention after the first month (0-1)
  c: number; // monthly churn after the first month (0-1)
  e: number; // monthly revenue expansion on retained customers (0-0.1)
  gm: number; // gross margin (0-1)
}

export const HORIZON = 24;

export type Lever = 'N' | 'CAC' | 'ARPA' | 'r1' | 'c' | 'e';
export const LEVERS: Lever[] = ['N', 'CAC', 'ARPA', 'r1', 'c', 'e'];

export interface MonthPoint {
  month: number;
  mrr: number;
  cost: number;
  contribution: number; // MRR * gm - N * CAC for this month
  cumulative: number; // running sum of contribution
}

export interface Result {
  series: MonthPoint[];
  mrr12: number;
  mrr24: number;
  cumulative: number; // objective: cumulative contribution at H
  payback: number | null; // month a single customer's margin covers CAC
  breakEven: number | null; // first month cumulative contribution turns >= 0
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Share of a cohort still active at age a. */
export function survival(a: number, r1: number, c: number): number {
  if (a <= 0) return 1;
  return r1 * Math.pow(1 - c, a - 1);
}

/** Expected revenue at age a from one acquired customer (survival × ARPA grown by expansion). */
function revenueAtAge(a: number, p: Inputs): number {
  return survival(a, p.r1, p.c) * p.ARPA * Math.pow(1 + p.e, a);
}

export function simulate(p: Inputs, H: number = HORIZON): Result {
  // Every cohort is identical, so MRR(m) = N * sum of per-customer revenue over ages 0..m-1.
  const series: MonthPoint[] = [];
  let perCustomerRevenueSum = 0;
  let cumulative = 0;
  let breakEven: number | null = null;
  for (let m = 1; m <= H; m++) {
    perCustomerRevenueSum += revenueAtAge(m - 1, p);
    const mrr = p.N * perCustomerRevenueSum;
    const cost = p.N * p.CAC;
    const contribution = mrr * p.gm - cost;
    cumulative += contribution;
    if (breakEven === null && cumulative >= 0 && m > 1) breakEven = m;
    series.push({ month: m, mrr, cost, contribution, cumulative });
  }
  return {
    series,
    mrr12: series[Math.min(12, H) - 1]?.mrr ?? 0,
    mrr24: series[H - 1]?.mrr ?? 0,
    cumulative,
    payback: paybackMonth(p, H),
    breakEven: p.N > 0 ? breakEven : null,
  };
}

/** First month (1..H) in which a customer's cumulative gross margin covers CAC, else null. */
export function paybackMonth(p: Inputs, H: number = HORIZON): number | null {
  if (p.CAC <= 0) return 1;
  let margin = 0;
  for (let m = 1; m <= H; m++) {
    margin += revenueAtAge(m - 1, p) * p.gm;
    if (margin >= p.CAC) return m;
  }
  return null;
}

export const objective = (p: Inputs, H: number = HORIZON) => simulate(p, H).cumulative;

/** Move one lever by a relative amount x (0.1 = 10%) in its favourable direction, within bounds. */
export function pushLever(p: Inputs, lever: Lever, x: number): Inputs {
  const q = { ...p };
  switch (lever) {
    case 'N':
      q.N = p.N * (1 + x);
      break;
    case 'ARPA':
      q.ARPA = p.ARPA * (1 + x);
      break;
    case 'CAC':
      q.CAC = Math.max(0, p.CAC * (1 - x));
      break;
    case 'r1':
      q.r1 = clamp(p.r1 * (1 + x), 0, 1);
      break;
    case 'c':
      q.c = clamp(p.c * (1 - x), 0, 1);
      break;
    case 'e':
      q.e = clamp(p.e * (1 + x), 0, 0.1);
      break;
  }
  return q;
}

/** Largest meaningful relative push for a lever (e.g. CAC cannot go below 0). */
function maxPush(p: Inputs, lever: Lever): number {
  switch (lever) {
    case 'CAC':
    case 'c':
      return 1;
    case 'r1':
      return p.r1 > 0 ? 1 / p.r1 - 1 : 0;
    case 'e':
      return p.e > 0 ? 0.1 / p.e - 1 : 0;
    default:
      return 10; // N and ARPA: up to +1000%, well past anything useful
  }
}

export interface TornadoBar {
  lever: Lever;
  delta: number; // change in objective
  deltaPct: number | null; // relative to |base objective|, null if base is 0
  capped: boolean; // the +10% was cut by a bound (r1 ≤ 1, e ≤ 10%)
}

export function tornado(p: Inputs, step = 0.1, H: number = HORIZON): TornadoBar[] {
  const base = objective(p, H);
  return LEVERS.map((lever) => {
    const pushed = pushLever(p, lever, step);
    const delta = objective(pushed, H) - base;
    const capped =
      (lever === 'r1' && p.r1 * (1 + step) > 1) || (lever === 'e' && p.e * (1 + step) > 0.1);
    return { lever, delta, deltaPct: base !== 0 ? delta / Math.abs(base) : null, capped };
  }).sort((a, b) => b.delta - a.delta);
}

/**
 * Bisection: smallest relative push x of `lever` that raises the objective by `gain`.
 * Returns null when even the maximum push cannot get there.
 */
export function equivalentPush(
  p: Inputs,
  lever: Lever,
  gain: number,
  H: number = HORIZON,
): number | null {
  if (gain <= 0) return 0;
  const base = objective(p, H);
  const gainAt = (x: number) => objective(pushLever(p, lever, x), H) - base;
  let hi = maxPush(p, lever);
  if (hi <= 0 || gainAt(hi) < gain) return null;
  let lo = 0;
  for (let i = 0; i < 80 && hi - lo > 1e-7; i++) {
    const mid = (lo + hi) / 2;
    if (gainAt(mid) >= gain) hi = mid;
    else lo = mid;
  }
  return hi;
}

export type Insight =
  // "+10% of `lever` is worth as much as `x` push on `ref`"
  | { kind: 'equivalent'; lever: Lever; ref: Lever; x: number; capped: boolean }
  // the top lever beats anything the reference lever can do alone
  | { kind: 'beyond'; lever: Lever; ref: Lever }
  // each new customer loses money within H: acquiring more makes it worse
  | { kind: 'unprofitable'; lever: Lever }
  | { kind: 'noCustomers' };

export function insight(p: Inputs, H: number = HORIZON): Insight {
  if (p.N <= 0) return { kind: 'noCustomers' };
  const bars = tornado(p, 0.1, H);
  const top = bars[0];
  const nBar = bars.find((b) => b.lever === 'N')!;

  // Acquiring more customers hurts: say so, it is the most useful thing to know.
  if (nBar.delta < 0 && top.lever !== 'N') return { kind: 'unprofitable', lever: top.lever };

  if (top.lever !== 'CAC') {
    const x = equivalentPush(p, 'CAC', top.delta, H);
    if (x !== null && x < 0.95) {
      return { kind: 'equivalent', lever: top.lever, ref: 'CAC', x, capped: top.capped };
    }
    // CAC alone can't match it: compare against more new customers if that helps.
    if (top.lever !== 'N' && nBar.delta > 0) {
      const xn = equivalentPush(p, 'N', top.delta, H);
      if (xn !== null) return { kind: 'equivalent', lever: top.lever, ref: 'N', x: xn, capped: top.capped };
    }
    return { kind: 'beyond', lever: top.lever, ref: 'CAC' };
  }

  // CAC is the strongest lever: express it in terms of the runner-up.
  const second = bars.find((b) => b.lever !== 'CAC' && b.delta > 0);
  if (!second) return { kind: 'beyond', lever: 'CAC', ref: 'N' };
  const x = equivalentPush(p, second.lever, top.delta, H);
  if (x === null) return { kind: 'beyond', lever: 'CAC', ref: second.lever };
  return { kind: 'equivalent', lever: 'CAC', ref: second.lever, x, capped: false };
}
