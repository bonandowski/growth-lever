import { useEffect, useMemo, useState } from 'react';
import { equivalentPush, insight, leverImpacts, pushLever, simulate, type Lever } from './model';
import { ASSUMPTIONS, LEVER_SUBJECT, refPhrase } from './copy';
import { eur } from './format';
import { PRESETS } from './presets';
import { readState, sanitize, writeState, type AppState } from './url';
import { Bucket } from './components/Bucket';
import { LeverButtons } from './components/LeverButtons';
import { NumbersPanel } from './components/NumbersPanel';

export default function App() {
  const [state, setState] = useState<AppState>(() => readState(window.location.search));
  const [panel, setPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const { inputs, lever } = state;

  useEffect(() => {
    window.history.replaceState(null, '', writeState(state));
  }, [state]);

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

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copia questo link:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="wrap">
      <header className="top">
        <span className="brand">Il secchio che perde</span>
        <button type="button" className="link" onClick={copyLink} aria-live="polite">
          {copied ? 'Link copiato' : 'Copia link'}
        </button>
      </header>

      <p className="banner">
        <strong>Numeri di esempio inventati:</strong> cambiali con i tuoi. Non salvo e non invio niente, il calcolo
        resta nel tuo browser: è solo a scopo dimostrativo.
      </p>

      <main className="main">
        <section className="copy" aria-live="polite">
          <h1>
            {title} <em>{accent}</em>
          </h1>
          {sub && <p className="sub">{sub}</p>}
          <dl className="kpis">
            <div><dt>MRR al mese 12</dt><dd>{eur(shown.mrr12)}</dd></div>
            <div><dt>MRR al mese 24</dt><dd>{eur(shown.mrr24)}</dd></div>
            <div><dt>Payback CAC</dt><dd>{shown.payback === null ? 'oltre 24 mesi' : `${shown.payback} mesi`}</dd></div>
          </dl>
        </section>
        <div className="scene">
          <Bucket base={base} shown={shown} inputs={pushed} lever={lever} />
        </div>
      </main>

      <LeverButtons impacts={impacts} selected={lever} onSelect={(l) => setState((s) => ({ ...s, lever: l }))} />

      <div className="extras">
        <button type="button" className="link" aria-expanded={panel} aria-controls="numbers" onClick={() => setPanel((v) => !v)}>
          {panel ? 'Chiudi i numeri' : 'Usa i miei numeri'}
        </button>
        <div id="numbers" hidden={!panel}>
          <NumbersPanel
            inputs={inputs}
            preset={state.preset}
            onPreset={(k) => setState((s) => ({ ...s, preset: k, inputs: { ...PRESETS[k] } }))}
            onChange={(p) => setState((s) => ({ ...s, preset: null, inputs: sanitize(p) }))}
          />
        </div>
        <details className="assumptions">
          <summary>Come ragiona il modello</summary>
          <ul>{ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>
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
