import { useEffect, useRef, useState } from 'react';
import type { Inputs, Lever, Result } from '../model';
import { eur, num, pct } from '../format';

interface Props {
  base: Result; // numbers before any lever, used for the "before" line and the scale
  shown: Result; // numbers the scene shows (after the selected lever, if any)
  inputs: Inputs; // inputs behind `shown`
  lever: Lever | null;
  /** Highest MRR the scene may show for these inputs: keeps the scale still while levers change. */
  scaleMax: number;
  unit: string; // what one unit of acquisition is: signup, install, visite…
}

// Geometry of the bucket (viewBox units).
const BX0 = 260, BX1 = 620, BY0 = 300, BY1 = 620, TAPER = 22;
const xl = (y: number) => BX0 + TAPER * ((y - BY0) / (BY1 - BY0));
const xr = (y: number) => BX1 - TAPER * ((y - BY0) / (BY1 - BY0));

// Blue ramp for cohort strata: oldest customers deep at the bottom, newest light on top.
const DEEP = [18, 72, 116], LIGHT = [156, 207, 238];
const blue = (t: number) => `rgb(${DEEP.map((a, i) => Math.round(a + (LIGHT[i] - a) * t)).join(',')})`;

/** Stroke width for a monthly € flow, relative to MRR; compressed so small flows stay visible. */
const MAX_FLOW = 40;
const flowWidth = (flow: number, ref: number) =>
  flow <= 0 || ref <= 0 ? 0 : Math.min(MAX_FLOW, 3 + 80 * Math.pow(flow / ref, 0.75));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animate an array of numbers towards a target (short ease-out), unless motion is reduced. */
function useTween(target: number[], ms = 520): number[] {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (prefersReducedMotion() || from.current.length !== target.length) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease in-out
      const next = target.map((v, i) => origin[i] + (v - origin[i]) * k);
      from.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.join(',')]);
  return value;
}

export function Bucket({ base, shown, inputs: q, lever, scaleMax, unit }: Props) {
  const last = shown.series[shown.series.length - 1];
  const ref = base.mrr24 || 1;
  const cap = Math.max(scaleMax, base.mrr24, shown.mrr24, 1) * 1.15;
  const yOf = (m: number) => BY1 - 6 - (m / cap) * (BY1 - BY0 - 6);

  // Flows (€ per month), drawn as stream widths.
  const users = last.paidUsers + last.referredUsers;
  const wPayingT = flowWidth(last.newCustomers * q.ARPA, ref);
  // users entering the funnel: always at least as wide as what comes out of it
  const wUsersT = users > 0 ? Math.max(wPayingT + 6, flowWidth(users * q.ARPA, ref)) : 0;
  const wJetT = flowWidth(last.lostFirstMonth * q.ARPA, ref);
  const wDripT = Math.max(3, flowWidth((last.lostLater * q.ARPA) / 3, ref));
  const wUpsellT = Math.max(3, flowWidth(last.mrrExpansion * q.e * 3, ref));

  // Water: one stratum per cohort at month 24, upsell share on top in orange.
  // Everything that moves goes through one tween, so a lever change is a single smooth motion.
  const share = last.mrr > 0 ? (last.mrr - last.mrrExpansion) / last.mrr : 1;
  const strata = shown.cohortMrr.map((row) => row[row.length - 1] * share);
  const n = strata.length;
  const animated = useTween([...strata, last.mrrExpansion, wUsersT, wPayingT, wJetT, wDripT, wUpsellT]);
  const layers = animated.slice(0, n);
  const [expansion, wUsers, wPaying, wJet, wDrip, wUpsell] = animated.slice(n);
  const baseTotal = layers.reduce((a, b) => a + b, 0);
  const top = yOf(baseTotal + expansion);

  const band = (lo: number, hi: number, fill: string, key: string | number) => (
    <path key={key} d={`M${xl(lo)},${lo} L${xr(lo)},${lo} L${xr(hi)},${hi} L${xl(hi)},${hi} Z`} fill={fill} />
  );
  let acc = 0;
  const water = layers.map((v, k) => {
    const lo = yOf(acc);
    acc += v;
    return band(lo, yOf(acc) - 0.6, blue(k / Math.max(1, layers.length - 1)), k);
  });
  water.push(band(yOf(baseTotal), top, 'var(--upsell)', 'up'));

  const cacDrops = q.N > 0 ? Math.max(1, Math.min(5, Math.round(q.CAC / Math.max(1, q.ARPA * q.gm)))) : 0;
  const spillDrops = users > 0 ? Math.round(6 * (1 - q.act)) : 0;

  const hy = 548, hx = xl(hy);
  const before = lever && Math.abs(shown.mrr24 - base.mrr24) > 1 ? yOf(base.mrr24) : null;
  const on = (l: Lever) => (lever === l ? ' on' : '');

  const label = (x: number, y: number, k: string, n: string, anchor: 'start' | 'middle' | 'end', l?: Lever) => (
    <text className={`lab${l ? on(l) : ''}`} x={x} y={y} textAnchor={anchor}>
      <tspan className="k">{k}</tspan>
      <tspan className="n" x={x} dy="1.15em">{n}</tspan>
    </text>
  );

  const summary =
    `Secchio a 24 mesi: ${num(users)} ${unit} al mese entrano, ${pct(q.act, 1)} di activation, ` +
    `${pct(1 - q.r1)} churn M1, poi churn mensile ${pct(q.c, 1)}. MRR al mese 24: ${eur(shown.mrr24)}.`;

  return (
    <svg className="bucket" viewBox="0 0 780 760" role="img" aria-label={summary}>
      {/* acquisition tap; drops falling from the pipe are the money spent on CAC */}
      <path className="ln thick" d="M0,84 H296 q26,0 26,26 V120" />
      <circle className="knob" cx="110" cy="84" r="14" />
      {Array.from({ length: cacDrops }, (_, i) => (
        <path key={i} className="cac fall" style={{ animationDelay: `${i * 0.35}s` }}
          d={`M${168 + i * 24},${106 + (i % 2) * 14} q-6,10 0,15 q6,-5 0,-15z`} />
      ))}
      {wUsers > 0.5 && <path className="st light flow" d="M322,124 V196" strokeWidth={wUsers} />}

      {/* aha moment funnel: users who don't activate fly off the lip */}
      <path className="ln shape" d="M246,190 H398 L332,244 V264 H312 V244 Z" />
      {Array.from({ length: spillDrops }, (_, i) => {
        const t = i / Math.max(1, spillDrops - 1);
        return <circle key={i} className="spill" cx={236 - t * 50} cy={206 + t * 150} r={5 - t * 1.5} />;
      })}
      {wPaying > 0.5 && <path className="st mid flow" d={`M322,266 V${top + 2}`} strokeWidth={wPaying} />}

      {/* upsell tap, other colour */}
      <path className="ln" d="M660,204 H572 q-14,0 -14,14 V230" />
      <circle className="knob" cx="640" cy="204" r="9" />
      {q.e > 0 && <path className="st up flow" d={`M558,234 V${top + 2}`} strokeWidth={wUpsell} />}

      {/* referral: water already in the bucket brings new water back to the funnel */}
      {q.ref > 0 && (
        <>
          <path className="loop" d="M626,470 C760,440 760,140 410,176" />
          <path className="ln" d="M424,166 L408,176 L424,188" />
        </>
      )}

      <g>{water}</g>
      <path className="surf" d={`M${xl(top)},${top} H${xr(top)}`} />
      <path className="ln wall" d={`M${BX0 - 10},${BY0} L${xl(BY1)},${BY1 - 16} q2,16 20,16 H${xr(BY1) - 20} q18,0 20,-16 L${BX1 + 10},${BY0}`} />

      {/* big hole: customers lost after their first month */}
      {wJet > 0.5 && <path className="st mid flow" d={`M${hx - 4},${hy} C${hx - 54},${hy} ${hx - 86},${hy + 40} ${hx - 96},680`} strokeWidth={wJet} />}
      <circle className="hole" cx={hx} cy={hy} r={Math.max(8, wJet / 2 + 4)} />
      {lever === 'r1' && <rect className="patch" x={hx - 13} y={hy - 30} width="26" height="34" rx="7" transform={`rotate(-6 ${hx} ${hy})`} />}

      {/* small holes: ongoing churn */}
      {[360, 440, 520].map((x, i) =>
        lever === 'c' && i === 1 ? (
          <rect key={x} className="patch" x={x - 14} y={BY1 - 8} width="28" height="16" rx="6" />
        ) : (
          <g key={x}>
            <circle className="hole" cx={x} cy={BY1} r="5" />
            {q.c > 0 && <path className="st mid flow" d={`M${x},${BY1 + 6} V${652 + i * 6}`} strokeWidth={wDrip} />}
          </g>
        ),
      )}

      <path className="ground" d="M0,682 H780" />
      {before !== null && <path className="was" d={`M${xl(before) + 6},${before} H${xr(before) - 6}`} />}

      {label(20, 30, 'Acquisizione', `${num(q.N + (q.boost ?? 0))} ${unit}/mese`, 'start', 'N')}
      {label(160, 160, 'CAC', q.CAC < 10 ? `€${q.CAC.toLocaleString('it-IT', { maximumFractionDigits: 2 })}` : `€${num(q.CAC)}`, 'start', 'CAC')}
      {label(20, 230, 'Activation', pct(q.act, q.act < 0.1 ? 1 : 0), 'start', 'act')}
      {label(20, Math.min(top + 8, 470), 'MRR mese 24', eur(shown.mrr24), 'start')}
      {label(20, 540, 'Churn M1', pct(1 - q.r1), 'start', 'r1')}
      {label(440, 716, 'Churn mensile', pct(q.c, 1), 'middle', 'c')}
      {label(604, 150, 'Expansion', `+${pct(q.e, 1)}/mese`, 'middle', 'e')}
      {label(770, 560, 'Referral', `${num(last.referredUsers)}/mese`, 'end', 'ref')}
      {lever === 'ARPA' && label(410, 214, 'ARPA', `€${num(q.ARPA)}`, 'start', 'ARPA')}
    </svg>
  );
}
