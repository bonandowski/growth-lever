import { useCallback, useEffect, useMemo, useState } from 'react';
import { equalGainPlan, ltvToCac, nrr12, pushLever, simulate } from './model';
import { ASSUMPTIONS, LEVER_NAME, PRESET_LABEL, UNIT_N, leverMove, leverValue } from './copy';
import { eur, pct } from './format';
import { PRESETS, SOURCES, type PresetKey } from './presets';
import { readState, sanitize, writeState, type AppState } from './url';
import { Bucket } from './components/Bucket';
import { LeverButtons } from './components/LeverButtons';
import { ADVANCED_KEYS, NumberFields, NumbersPanel, QUICK_KEYS } from './components/NumbersPanel';
import { Onboarding } from './components/Onboarding';
import { Paywall, markPaywallSeen, paywallSeen } from './components/Paywall';

export default function App() {
  const [state, setState] = useState<AppState>(() => readState(window.location.search));
  const [panel, setPanel] = useState(false);
  // the joke paywall shows once, on the first lever click; the browser only remembers that it was seen
  const [paywall, setPaywall] = useState<'pending' | 'open' | 'done'>(() => (paywallSeen() ? 'done' : 'pending'));
  const closePaywall = useCallback(() => setPaywall('done'), []);
  const { inputs, lever } = state;

  useEffect(() => {
    window.history.replaceState(null, '', writeState(state) || window.location.pathname);
  }, [state]);

  const pickType = (k: PresetKey) => {
    setState({ onboarding: false, type: k, preset: k, inputs: { ...PRESETS[k] }, lever: null });
    setPanel(false);
    window.scrollTo(0, 0);
  };

  const base = useMemo(() => simulate(inputs), [inputs]);
  const plan = useMemo(() => equalGainPlan(inputs), [inputs]);
  const row = lever ? plan.rows.find((r) => r.lever === lever)! : null;
  const pushed = useMemo(() => (row ? pushLever(inputs, row.lever, row.applied) : inputs), [inputs, row]);
  const shown = useMemo(() => (row ? simulate(pushed) : base), [row, pushed, base]);
  const ratio = ltvToCac(pushed);
  // one scale for every lever, so switching levers never rescales the bucket
  const scaleMax = useMemo(
    () => Math.max(base.mrr24, ...plan.rows.map((r) => simulate(pushLever(inputs, r.lever, r.applied)).mrr24)),
    [inputs, plan, base],
  );

  const { title, accent, sub } = useMemo(() => {
    const goal = eur(plan.target);
    const mrr = `MRR al mese 24 da ${eur(base.mrr24)} a ${eur(shown.mrr24)}.`;
    if (row) {
      const name = LEVER_NAME[row.lever];
      const from = leverValue(row.lever, inputs, state.type);
      const to = leverValue(row.lever, pushed, state.type);
      const gain = shown.value - base.value;
      if (row.harmful)
        return {
          title: `${name} +10% qui`,
          accent: `toglie ${eur(-gain)} di valore.`,
          sub: 'Gli utenti in più costano e attivano meno: il secchio perde più di quanto entra.',
        };
      if (row.x === null)
        return {
          title: `${name} da sola non ci arriva:`,
          accent: `anche da ${from} a ${to} vale ${eur(gain)}.`,
          sub: `L’obiettivo è ${goal}. ${mrr}`,
        };
      return { title: `${name} ${leverMove(row.lever, inputs, pushed, state.type)}:`, accent: `+${goal} di valore in 5 anni.`, sub: mrr };
    }
    if (plan.target <= 0)
      return { title: 'Il secchio è vuoto:', accent: 'senza utenti non c’è niente da spingere.', sub: 'Inserisci i tuoi numeri qui sotto.' };
    const harmful = plan.rows.some((r) => r.harmful);
    return {
      title: `Per creare +${goal} di valore in 5 anni basta una toppa.`,
      accent: 'Scegli quella che per te costa meno spostare.',
      sub: `Ogni pulsante dice di quanto va mossa quella leva, da sola, per arrivarci.${harmful ? ' Più acquisizione invece qui toglie valore.' : ''}`,
    };
  }, [row, plan, inputs, pushed, base, shown, state.type]);

  if (state.onboarding) {
    return (
      <div className="wrap">
        <Onboarding onPick={pickType} />
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="top">
        <span className="brand">Il secchio che perde</span>
        <button type="button" className="link type-switch" onClick={() => setState((s) => ({ ...s, onboarding: true, lever: null }))}>
          {PRESET_LABEL[state.type]} · cambia
        </button>
      </header>


      <main className="main">
        <section className="hero">
          <h1>
            Stai versando soldi in un <em>secchio bucato.</em>
          </h1>
          <p className="sub">Guarda da dove perde, poi scegli una toppa.</p>
          <p className="data-note">
            <strong>Dati di settore da report pubblici, non i tuoi.</strong> I tuoi numeri non vengono salvati né inviati. Solo demo.
          </p>
        </section>
        <div className="scene">
          <Bucket base={base} shown={shown} inputs={pushed} lever={lever} scaleMax={scaleMax} unit={UNIT_N[state.type]} />
        </div>
        <section className="verdict" aria-live="polite">
          <p className="verdict-kicker">{row ? 'Con questa toppa' : 'Con questi numeri'}</p>
          <p className="verdict-text">
            {title} <em>{accent}</em>
          </p>
          {sub && <p className="verdict-sub">{sub}</p>}
          <dl className="kpis">
            <div><dt>MRR mese 24</dt><dd>{eur(shown.mrr24)}</dd></div>
            <div><dt>LTV/CAC</dt><dd>{ratio === null ? '—' : ratio.toLocaleString('it-IT', { maximumFractionDigits: 1 })}</dd></div>
            <div><dt>Payback CAC</dt><dd>{shown.payback === null ? 'oltre 24 mesi' : `${shown.payback} mesi`}</dd></div>
            <div><dt>NRR annuo</dt><dd>{pct(nrr12(pushed))}</dd></div>
          </dl>
        </section>
        <div className="levers-area">
        <LeverButtons
          rows={plan.rows}
          inputs={inputs}
          type={state.type}
          selected={lever}
          onSelect={(l) => {
            setState((s) => ({ ...s, lever: l }));
            if (l && paywall === 'pending') {
              setPaywall('open');
              markPaywallSeen();
            }
          }}
        />
        </div>
      </main>

      {paywall === 'open' && <Paywall onClose={closePaywall} />}

      {/* on small screens, type and data notice live here instead of above the bucket */}
      <div className="mobile-meta">
        <button type="button" className="link" onClick={() => setState((s) => ({ ...s, onboarding: true, lever: null }))}>
          {PRESET_LABEL[state.type]} · cambia attività
        </button>
        <p>Dati di settore da report pubblici, non i tuoi. I tuoi numeri non vengono salvati né inviati. Solo demo.</p>
      </div>

      <div className="extras">
        <section className="quick" aria-labelledby="quick-title">
          <h2 id="quick-title" className="quick-title">Metti i tuoi numeri</h2>
          <NumberFields
            type={state.type}
            inputs={inputs}
            keys={QUICK_KEYS}
            onChange={(p) => setState((s) => ({ ...s, preset: null, inputs: sanitize(p) }))}
          />
        </section>
        <button type="button" className="link" aria-expanded={panel} aria-controls="numbers" onClick={() => setPanel((v) => !v)}>
          {panel ? 'Chiudi' : 'Altri numeri ed esempi'}
        </button>
        <div id="numbers" hidden={!panel}>
          <NumbersPanel
            type={state.type}
            inputs={inputs}
            keys={ADVANCED_KEYS}
            preset={state.preset}
            onPreset={(k) => setState((s) => ({ ...s, type: k, preset: k, inputs: { ...PRESETS[k] } }))}
            onChange={(p) => setState((s) => ({ ...s, preset: null, inputs: sanitize(p) }))}
          />
        </div>
        <details className="assumptions">
          <summary>Come ragiona il modello</summary>
          <ul>{ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>
          <h2 className="sources-title">Da dove vengono i numeri: {PRESET_LABEL[state.type]}</h2>
          <table className="sources">
            <tbody>
              {SOURCES[state.type].map((src) => (
                <tr key={src.metric}>
                  <th scope="row">{src.metric}</th>
                  <td>{src.value}</td>
                  <td><span className={`origin ${src.origin}`}>{src.origin}</span></td>
                  <td>{src.url ? <a href={src.url} rel="noopener" target="_blank">{src.note}</a> : src.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sources-note">Quasi tutte le fonti sono sintesi di report di società di analytics, pagamenti o consulenza: i valori variano molto tra fonti diverse.</p>
        </details>
      </div>

      <footer className="foot">
        <span>
          Fatto da <a href="https://www.linkedin.com/in/leonardo-bonalumi/" rel="noopener" target="_blank">Leonardo Bonalumi</a>
          {' · '}
          <a href="mailto:leobonalumi@gmail.com">scrivimi</a>. Idraulico della crescita a tempo perso.
        </span>
        <span>
          Ispirato a{' '}
          <a href="https://www.goodreads.com/search?q=Growth+Levers+and+How+to+Find+Them" rel="noopener" target="_blank">
            <i>Growth Levers and How to Find Them</i>
          </a>
          , di Matt Lerner
        </span>
      </footer>
    </div>
  );
}
