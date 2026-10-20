import { useCallback, useEffect, useMemo, useState } from 'react';
import { equivalentPush, insight, leverImpacts, pushLever, simulate, type Lever } from './model';
import { ASSUMPTIONS, LEVER_SUBJECT, PRESET_LABEL, UNIT_N, refPhrase } from './copy';
import { eur } from './format';
import { PRESETS, SOURCES, type PresetKey } from './presets';
import { readState, sanitize, writeState, type AppState } from './url';
import { Bucket } from './components/Bucket';
import { LeverButtons } from './components/LeverButtons';
import { NumbersPanel } from './components/NumbersPanel';
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
  const impacts = useMemo(() => leverImpacts(inputs), [inputs]);
  const pushed = useMemo(() => (lever ? pushLever(inputs, lever, 0.1) : inputs), [inputs, lever]);
  const shown = useMemo(() => (lever ? simulate(pushed) : base), [lever, pushed, base]);

  const { title, accent, sub } = useMemo(() => {
    if (lever) {
      const impact = impacts.find((i) => i.lever === lever)!;
      const d = impact.delta;
      const mrr = `L’MRR al mese 24 passa da ${eur(base.mrr24)} a ${eur(shown.mrr24)}.`;
      if (impact.capped && d <= 0) return { title: `${LEVER_SUBJECT[lever]} qui non si può:`, accent: 'è già al massimo.', sub: '' };
      if (d < 0) return { title: `${LEVER_SUBJECT[lever]} qui`, accent: `toglie ${eur(-d)} di valore.`, sub: 'Gli utenti in più costano e hanno activation bassa. Prima lavora su retention e activation.' };
      if (d === 0) return { title: `${LEVER_SUBJECT[lever]} qui`, accent: 'non sposta niente.', sub: '' };
      const ref: Lever = lever === 'CAC' ? (impacts.find((i) => i.lever !== 'CAC' && i.delta > 0)?.lever ?? 'N') : 'CAC';
      const x = equivalentPush(inputs, ref, d);
      const accentText = x === null ? `più di qualsiasi ${ref === 'CAC' ? 'riduzione del CAC' : 'spinta su una leva sola'}.` : `${refPhrase(ref, x)}.`;
      return { title: `${LEVER_SUBJECT[lever]} vale quanto`, accent: accentText, sub: `+${eur(d)} di valore creato. ${mrr}` };
    }
    const i = insight(inputs);
    const value = `È la leva più forte con questi numeri. Oggi il secchio crea ${eur(base.value)} di valore: prova le altre qui sotto.`;
    switch (i.kind) {
      case 'equivalent':
        return { title: `${LEVER_SUBJECT[i.lever]} vale quanto`, accent: `${refPhrase(i.ref, i.x)}.`, sub: value };
      case 'beyond':
        return { title: LEVER_SUBJECT[i.lever], accent: 'vale più di qualsiasi riduzione del CAC.', sub: value };
      case 'acquisitionHurts':
        return { title: 'Qui più acquisizione', accent: 'distrugge valore.', sub: `Il secchio perde troppo. Prima: ${LEVER_SUBJECT[i.lever]}.` };
      default:
        return { title: 'Il secchio è vuoto:', accent: 'senza utenti non c’è niente da spingere.', sub: 'Inserisci i tuoi numeri qui sotto.' };
    }
  }, [lever, impacts, inputs, base, shown]);


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

      <p className="banner">
        <strong className="banner-long">Ordini di grandezza da report pubblici, non i tuoi numeri</strong>
        <span className="banner-long">: cambiali con i tuoi. I tuoi numeri non vengono salvati né inviati: il calcolo resta nel tuo browser. È solo a scopo dimostrativo.</span>
      </p>

      <main className="main">
        <section className="hero">
          <h1>
            Stai versando soldi in un <em>secchio bucato.</em>
          </h1>
          <p className="sub">Guarda da dove perde, poi premi una toppa.</p>
        </section>
        <div className="scene">
          <Bucket base={base} shown={shown} inputs={pushed} lever={lever} unit={UNIT_N[state.type]} />
        </div>
        <section className="verdict" aria-live="polite">
          <p className="verdict-kicker">{lever ? 'Con questa toppa' : 'Con questi numeri'}</p>
          <p className="verdict-text">
            {title} <em>{accent}</em>
          </p>
          {sub && <p className="verdict-sub">{sub}</p>}
          <dl className="kpis">
            <div><dt>MRR mese 12</dt><dd>{eur(shown.mrr12)}</dd></div>
            <div><dt>MRR mese 24</dt><dd>{eur(shown.mrr24)}</dd></div>
            <div><dt>Payback CAC</dt><dd>{shown.payback === null ? 'oltre 24 mesi' : `${shown.payback} mesi`}</dd></div>
          </dl>
        </section>
        <div className="levers-area">
        <LeverButtons
          impacts={impacts}
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
        <button type="button" className="link" aria-expanded={panel} aria-controls="numbers" onClick={() => setPanel((v) => !v)}>
          {panel ? 'Chiudi i numeri' : 'Usa i miei numeri'}
        </button>
        <div id="numbers" hidden={!panel}>
          <NumbersPanel
            type={state.type}
            inputs={inputs}
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
