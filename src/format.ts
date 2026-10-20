const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' });

export const num = (v: number) => nf.format(Math.round(v));

/** Compact euros: €850, €12K, €1,9 mln. */
export function eur(v: number): string {
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1e6) return `${sign}€${(a / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 })} mln`;
  if (a >= 1e4) return `${sign}€${nf.format(Math.round(a / 1000))}K`;
  return `${sign}€${nf.format(Math.round(a))}`;
}

export const pct = (v: number, digits = 0) =>
  `${(v * 100).toLocaleString('it-IT', { maximumFractionDigits: digits })}%`;
