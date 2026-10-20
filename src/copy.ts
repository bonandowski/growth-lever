import type { Lever } from './model';
import type { PresetKey } from './presets';

// All user-facing text lives here. The site is Italian only.

export const LEVER_BUTTON: Record<Lever, string> = {
  N: 'Acquisizione +10%',
  CAC: 'CAC −10%',
  act: 'Activation +10%',
  ARPA: 'ARPA +10%',
  r1: 'Retention M1 +10%',
  c: 'Churn −10%',
  e: 'Expansion +10%',
  ref: 'Referral +10%',
};

export const LEVER_HINT: Record<Lever, string> = {
  N: 'nuovi utenti a pagamento',
  CAC: 'costo per utente acquisito',
  act: 'utenti che arrivano all’aha moment',
  ARPA: 'ricavo mensile per cliente',
  r1: 'clienti attivi dopo il primo mese',
  c: 'churn mensile dal secondo mese',
  e: 'upsell sui clienti attivi',
  ref: 'utenti portati dai clienti',
};

/** Subject of a sentence: "<subject> vale quanto …". */
export const LEVER_SUBJECT: Record<Lever, string> = {
  N: '+10% di acquisizione',
  CAC: '−10% di CAC',
  act: '+10% di activation',
  ARPA: '+10% di ARPA',
  r1: '+10% di retention M1',
  c: '−10% di churn',
  e: '+10% di expansion',
  ref: '+10% di referral',
};

const NAME: Record<Lever, string> = {
  N: 'acquisizione', CAC: 'CAC', act: 'activation', ARPA: 'ARPA', r1: 'retention M1', c: 'churn', e: 'expansion', ref: 'referral',
};

/** How a relative push x of a reference lever reads: "−27% di CAC". */
export function refPhrase(ref: Lever, x: number): string {
  const v = Math.round(x * 100);
  return ref === 'CAC' || ref === 'c' ? `−${v}% di ${NAME[ref]}` : `+${v}% di ${NAME[ref]}`;
}

export const PRESET_LABEL: Record<PresetKey, string> = {
  b2bPlg: 'SaaS B2B product-led',
  b2bSales: 'SaaS B2B sales-led',
  b2cApp: 'App B2C in abbonamento',
  ecommerce: 'E-commerce D2C',
  news: 'News con abbonamento',
};

export const PRESET_TAGLINE: Record<PresetKey, string> = {
  b2bPlg: 'trial o freemium, self-serve',
  b2bSales: 'pochi clienti grandi, team sales',
  b2cApp: 'fitness, learning, produttività',
  ecommerce: 'prodotti che si ricomprano',
  news: 'paywall e abbonamento digitale',
};

/** What one unit of acquisition is, per business type. */
export const UNIT_N: Record<PresetKey, string> = {
  b2bPlg: 'signup',
  b2bSales: 'opportunità',
  b2cApp: 'install',
  ecommerce: 'visite',
  news: 'visite',
};

export const UNIT_N_ONE: Record<PresetKey, string> = {
  b2bPlg: 'signup',
  b2bSales: 'opportunità',
  b2cApp: 'install',
  ecommerce: 'visita',
  news: 'visita',
};

export const FIELDS = [
  { key: 'N', label: 'Acquisizione', unit: 'al mese', min: 0, max: 10000000, step: 10, scale: 1 },
  { key: 'CAC', label: 'CAC', unit: '€', min: 0, max: 100000, step: 10, scale: 1 },
  { key: 'act', label: 'Activation: utenti che pagano', unit: '%', min: 0, max: 100, step: 1, scale: 100 },
  { key: 'ARPA', label: 'ARPA: ricavo mensile per cliente', unit: '€', min: 0, max: 100000, step: 1, scale: 1 },
  { key: 'r1', label: 'Retention M1: attivi dopo il mese 1', unit: '%', min: 0, max: 100, step: 1, scale: 100 },
  { key: 'c', label: 'Churn mensile dal mese 2', unit: '%', min: 0, max: 100, step: 0.5, scale: 100 },
  { key: 'e', label: 'Expansion mensile (upsell)', unit: '%', min: 0, max: 10, step: 0.1, scale: 100 },
  { key: 'ref', label: 'Referral: utenti al mese ogni 100 clienti', unit: 'utenti', min: 0, max: 10, step: 0.5, scale: 100 },
  { key: 'gm', label: 'Gross margin', unit: '%', min: 0, max: 100, step: 1, scale: 100 },
] as const;

export const ASSUMPTIONS = [
  'Ogni mese entrano utenti acquisiti (CAC costante, già mediato con il traffico organico dove indicato) e utenti da referral (CAC zero).',
  'Activation: solo chi arriva all’aha moment paga. Gli altri escono subito.',
  'Con +10% di acquisizione, gli utenti in più hanno metà dell’activation attuale: spesso sono meno interessati.',
  'Dopo la retention M1 il churn è costante. Nessuna stagionalità, nessun limite di mercato, prezzo e margine fissi.',
  'L’expansion fa crescere l’ARPA dei clienti attivi, ogni mese della stessa percentuale.',
  'Confronto le leve sul valore creato: gross margin meno CAC nei 24 mesi, più il margine che i clienti ancora attivi daranno nei 36 mesi dopo. Niente attualizzazione.',
  'Il browser ricorda solo una cosa: che hai già visto il finto paywall (localStorage, nessun dato). I tuoi numeri non vengono salvati.',
  'I numeri di partenza sono ordini di grandezza da report pubblici, arrotondati: non sono i tuoi e non sono una previsione.',
];
