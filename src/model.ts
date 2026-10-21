// Pure growth model of a subscription product, seen as a leaky bucket.
// No DOM, no React: everything here is plain functions over numbers.
//
// Time: months t = 1..H. Every month new users arrive from paid acquisition (N, each
// costing CAC) and from referrals (free). A share `act` reaches the aha moment and pays;
// the rest spill over. Paying customers form a cohort that churns and expands over time.

export interface Inputs {
  N: number; // new users per month from paid acquisition
  CAC: number; // acquisition cost per user (€)
  act: number; // activation: share of new users that reach the aha moment and pay (0-1)
  ARPA: number; // monthly revenue per paying customer (€)
  r1: number; // share of customers still there after their first month (0-1)
  c: number; // monthly churn after the first month (0-1)
  e: number; // monthly upsell/expansion on retained customers (0-0.1)
  ref: number; // new users per month brought by each active customer, at zero CAC (0-0.1)
  gm: number; // gross margin (0-1)
  /** Extra paid users on top of N, used only to test the acquisition lever. */
  boost?: number;
}

export const HORIZON = 24;
/** Months of future margin still counted for customers active at the horizon. */
export const TAIL = 36;
/** Extra users bought by pushing acquisition activate at this fraction of the current rate. */
export const MARGINAL_ACTIVATION = 0.5;

export const LIMITS = { act: 1, r1: 1, c: 1, e: 0.1, ref: 0.1, gm: 1 } as const;

export type Lever = 'N' | 'CAC' | 'act' | 'ARPA' | 'r1' | 'c' | 'e' | 'ref';
export const LEVERS: Lever[] = ['N', 'CAC', 'act', 'ARPA', 'r1', 'c', 'e', 'ref'];

export interface MonthPoint {
  month: number;
  paidUsers: number; // users from paid acquisition this month
  referredUsers: number; // users from referrals this month
  newCustomers: number; // users that activated and pay
  active: number; // paying customers at the end of the month
  mrr: number;
  mrrExpansion: number; // part of MRR coming from upsell
  lostFirstMonth: number; // customers lost after their first month this month
  lostLater: number; // customers lost to ongoing churn this month
  cost: number;
  contribution: number; // mrr * gm - cost
  cumulative: number;
}

export interface Result {
  series: MonthPoint[];
  /** cohortMrr[k][t-1]: MRR in month t from customers acquired in month k+1. */
  cohortMrr: number[][];
  mrr12: number;
  mrr24: number;
  active: number;
  cumulative: number; // contribution summed over the horizon
  tail: number; // future margin of customers active at the horizon
  value: number; // objective: cumulative + tail
  payback: number | null; // months for a paying customer's margin to cover acquisition
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Share of a cohort still paying at age a (age 0 = month of signup). */
export function survival(a: number, r1: number, c: number): number {
  if (a <= 0) return 1;
  return r1 * Math.pow(1 - c, a - 1);
}

export function simulate(p: Inputs, H: number = HORIZON): Result {
  const boost = p.boost ?? 0;
  const cohorts: number[] = []; // customers acquired per month
  const cohortMrr: number[][] = [];
  const series: MonthPoint[] = [];
  let prevActive = 0;
  let cumulative = 0;

  for (let t = 1; t <= H; t++) {
    const referredUsers = p.ref * prevActive;
    const newCustomers =
      (p.N + referredUsers) * p.act + boost * p.act * MARGINAL_ACTIVATION;
    cohorts.push(newCustomers);
    cohortMrr.push(new Array(H).fill(0));

    let active = 0;
    let mrr = 0;
    let mrrBase = 0;
    let lostFirstMonth = 0;
    let lostLater = 0;
    cohorts.forEach((n, k) => {
      const age = t - 1 - k;
      const s = survival(age, p.r1, p.c);
      const rev = n * s * p.ARPA * Math.pow(1 + p.e, age);
      active += n * s;
      mrr += rev;
      mrrBase += n * s * p.ARPA;
      cohortMrr[k][t - 1] = rev;
      const lost = n * (survival(age - 1, p.r1, p.c) - s);
      if (age === 1) lostFirstMonth += lost;
      else if (age > 1) lostLater += lost;
    });

    const cost = (p.N + boost) * p.CAC;
    const contribution = mrr * p.gm - cost;
    cumulative += contribution;
    series.push({
      month: t,
      paidUsers: p.N + boost,
      referredUsers,
      newCustomers,
      active,
      mrr,
      mrrExpansion: mrr - mrrBase,
      lostFirstMonth,
      lostLater,
      cost,
      contribution,
      cumulative,
    });
    prevActive = active;
  }

  // Customers still in the bucket keep paying after the horizon: count TAIL more months
  // of their margin, with no new acquisition and no new referrals.
  let tail = 0;
  for (let f = 1; f <= TAIL; f++) {
    cohorts.forEach((n, k) => {
      const age = H - 1 - k + f;
      tail += n * survival(age, p.r1, p.c) * p.ARPA * Math.pow(1 + p.e, age) * p.gm;
    });
  }

  return {
    series,
    cohortMrr,
    mrr12: series[Math.min(12, H) - 1]?.mrr ?? 0,
    mrr24: series[H - 1]?.mrr ?? 0,
    active: series[H - 1]?.active ?? 0,
    cumulative,
    tail,
    value: cumulative + tail,
    payback: paybackMonth(p, H),
  };
}

/**
 * Months until one paying customer's cumulative margin covers what it cost to get them
 * (CAC / activation, since only activated users pay). Null if not within H.
 */
export function paybackMonth(p: Inputs, H: number = HORIZON): number | null {
  if (p.act <= 0) return null;
  const costPerCustomer = p.CAC / p.act;
  if (costPerCustomer <= 0) return 1;
  let margin = 0;
  for (let m = 1; m <= H; m++) {
    margin += survival(m - 1, p.r1, p.c) * p.ARPA * Math.pow(1 + p.e, m - 1) * p.gm;
    if (margin >= costPerCustomer) return m;
  }
  return null;
}

export const objective = (p: Inputs, H: number = HORIZON) => simulate(p, H).value;

/** Move one lever by a relative amount x (0.1 = 10%) in its favourable direction, within bounds. */
export function pushLever(p: Inputs, lever: Lever, x: number): Inputs {
  const q = { ...p };
  switch (lever) {
    case 'N':
      // More paid users, but the extra ones are less interested (see MARGINAL_ACTIVATION).
      q.boost = (p.boost ?? 0) + p.N * x;
      break;
    case 'CAC':
      q.CAC = Math.max(0, p.CAC * (1 - x));
      break;
    case 'c':
      q.c = clamp(p.c * (1 - x), 0, 1);
      break;
    case 'ARPA':
      q.ARPA = p.ARPA * (1 + x);
      break;
    default:
      q[lever] = clamp(p[lever] * (1 + x), 0, LIMITS[lever]);
  }
  return q;
}

/** Largest relative push that still changes the lever (bounds included). */
function maxPush(p: Inputs, lever: Lever): number {
  switch (lever) {
    case 'CAC':
    case 'c':
      return 1;
    case 'N':
    case 'ARPA':
      return 10;
    default: {
      const v = p[lever];
      return v > 0 ? LIMITS[lever] / v - 1 : 0;
    }
  }
}

export interface LeverImpact {
  lever: Lever;
  delta: number; // change in value created
  capped: boolean; // the +10% hit a bound (e.g. retention already near 100%)
}

export function leverImpacts(p: Inputs, step = 0.1, H: number = HORIZON): LeverImpact[] {
  const base = objective(p, H);
  return LEVERS.map((lever) => ({
    lever,
    delta: objective(pushLever(p, lever, step), H) - base,
    capped: maxPush(p, lever) < step,
  })).sort((a, b) => b.delta - a.delta);
}

/**
 * Bisection: smallest relative push of `lever` that adds `gain` to the objective.
 * Null when even the largest possible push cannot get there.
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
  /** +10% on `lever` is worth as much as pushing `ref` by x. */
  | { kind: 'equivalent'; lever: Lever; ref: Lever; x: number }
  /** `lever` beats anything `ref` can do on its own. */
  | { kind: 'beyond'; lever: Lever; ref: Lever }
  /** Buying more users destroys value: the bucket leaks faster than it fills. */
  | { kind: 'acquisitionHurts'; lever: Lever }
  | { kind: 'empty' };

export function insight(p: Inputs, H: number = HORIZON): Insight {
  const impacts = leverImpacts(p, 0.1, H);
  const top = impacts[0];
  if (top.delta <= 0) return { kind: 'empty' };
  const acq = impacts.find((i) => i.lever === 'N')!;
  if (acq.delta < 0) return { kind: 'acquisitionHurts', lever: top.lever };

  // Default comparison: how much cheaper acquisition would need to be.
  if (top.lever !== 'CAC' && p.N > 0 && p.CAC > 0) {
    const x = equivalentPush(p, 'CAC', top.delta, H);
    if (x !== null && x < 0.95) return { kind: 'equivalent', lever: top.lever, ref: 'CAC', x };
    if (top.lever !== 'N') {
      const xn = equivalentPush(p, 'N', top.delta, H);
      if (xn !== null) return { kind: 'equivalent', lever: top.lever, ref: 'N', x: xn };
    }
    return { kind: 'beyond', lever: top.lever, ref: 'CAC' };
  }

  // CAC on top (or acquisition not comparable): express it with the runner-up.
  const second = impacts.find((i) => i.lever !== top.lever && i.delta > 0);
  if (!second) return { kind: 'beyond', lever: top.lever, ref: 'N' };
  const x = equivalentPush(p, second.lever, top.delta, H);
  if (x === null) return { kind: 'beyond', lever: top.lever, ref: second.lever };
  return { kind: 'equivalent', lever: top.lever, ref: second.lever, x };
}

export interface PlanRow {
  lever: Lever;
  /** Relative push that reaches the target; null if the lever can't get there on its own. */
  x: number | null;
  /** Pushing this lever lowers value (e.g. buying more low-intent users). */
  harmful: boolean;
  /** Push actually applied when the row is selected: x, or the largest useful push. */
  applied: number;
}

export interface EqualGainPlan {
  target: number; // value gain every row aims for
  rows: PlanRow[]; // in LEVERS order
}

/**
 * Same goal for every lever: the gain of the strongest +10% push. Each row says how far that
 * lever alone must move to match it, so levers are compared on the move they need, not on an
 * equal relative push (which always favours activation and price).
 */
export function equalGainPlan(p: Inputs, H: number = HORIZON): EqualGainPlan {
  const impacts = leverImpacts(p, 0.1, H);
  const target = Math.max(0, impacts[0]?.delta ?? 0);
  const rows = LEVERS.map((lever) => {
    const impact = impacts.find((i) => i.lever === lever)!;
    const harmful = impact.delta < 0;
    const x = target > 0 && !harmful ? equivalentPush(p, lever, target, H) : null;
    const applied = x ?? (harmful ? 0.1 : Math.min(maxPush(p, lever), 1));
    return { lever, x, harmful, applied };
  });
  return { target, rows };
}

/** Margin a paying customer brings over horizon + tail (5 years by default). */
export function customerLtv(p: Inputs, months: number = HORIZON + TAIL): number {
  let ltv = 0;
  for (let a = 0; a < months; a++) ltv += survival(a, p.r1, p.c) * p.ARPA * Math.pow(1 + p.e, a) * p.gm;
  return ltv;
}

/** LTV over what one paying customer cost to acquire (paid users only: referrals are free). */
export function ltvToCac(p: Inputs): number | null {
  const cost = p.act > 0 ? p.CAC / p.act : 0;
  return cost > 0 ? customerLtv(p) / cost : null;
}

/** Yearly net revenue retention of customers past their first month: churn and upsell. */
export const nrr12 = (p: Inputs) => Math.pow((1 - p.c) * (1 + p.e), 12);
