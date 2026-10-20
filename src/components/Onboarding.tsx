import { PRESET_LABEL, PRESET_TAGLINE } from '../copy';
import { PRESET_KEYS, type PresetKey } from '../presets';

// Line drawings in the same style as the bucket, one per business type.
const ICONS: Record<PresetKey, JSX.Element> = {
  // funnel: trial to paid
  b2bPlg: (<><path d="M6,8 H34 L23,21 V31 H17 V21 Z" /><path className="water" d="M20,34 V38" /></>),
  // two hands meeting: a sales deal
  b2bSales: (<><path d="M3,22 L11,14 H17 L23,20" /><path d="M37,22 L29,14 H23 L15,22 q-2,3 1,4 l3,-2 l3,3 l3,-2 l3,2 l5,-5" /></>),
  // phone with a subscription badge
  b2cApp: (<><rect x="12" y="4" width="16" height="32" rx="4" /><path d="M18,31 H22" /><path className="water" d="M16,14 H24 M16,19 H22" /></>),
  // shopping bag
  ecommerce: (<><path d="M8,14 H32 L30,36 H10 Z" /><path d="M14,14 V11 a6,6 0 0,1 12,0 V14" /><path className="water" d="M15,24 q5,5 10,0" /></>),
  // folded newspaper
  news: (<><path d="M6,8 H30 V32 q0,3 3,3 H9 q-3,0 -3,-3 Z" /><path d="M30,14 H35 V32 q0,3 -2,3" /><path className="water" d="M11,14 H25 M11,20 H25 M11,26 H20" /></>),
};

export function Onboarding({ onPick }: { onPick: (k: PresetKey) => void }) {
  return (
    <main className="onboarding">
      <p className="onb-kicker">Il secchio che perde</p>
      <h1>
        Che secchio stai <em>riempiendo?</em>
      </h1>
      <p className="sub">Scegli il modello più vicino al tuo: parto da ordini di grandezza pubblici per quel tipo di business.</p>
      <div className="onb-cards" role="group" aria-label="Tipo di business">
        {PRESET_KEYS.map((k) => (
          <button key={k} type="button" className="patch-btn onb-card" onClick={() => onPick(k)}>
            <svg className="onb-icon" viewBox="0 0 40 40" aria-hidden="true">{ICONS[k]}</svg>
            <span className="patch-text">
              <span className="onb-label">{PRESET_LABEL[k]}</span>
              <span className="patch-hint">{PRESET_TAGLINE[k]}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="onb-note">Niente viene salvato o inviato. Potrai sempre mettere i tuoi numeri.</p>
    </main>
  );
}
