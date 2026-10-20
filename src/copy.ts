import type { Lever } from './model';
import type { PresetKey } from './presets';

// All user-facing text lives here. The site is Italian only.

export const LEVER_BUTTON: Record<Lever, string> = {
  N: 'Più acquisizione',
  CAC: 'CAC più basso',
  act: 'Più aha moment',
  ARPA: 'Prezzo più alto',
  r1: 'Toppa sul buco grande',
  c: 'Meno churn',
  e: 'Più upsell',
  ref: 'Più passaparola',
};

export const LEVER_HINT: Record<Lever, string> = {
  N: '+10% utenti comprati',
  CAC: '−10% costo per utente',
  act: '+10% arriva al valore',
  ARPA: '+10% ricavo per cliente',
  r1: '+10% resta dopo il mese 1',
  c: '−10% churn mensile',
  e: '+10% espansione',
  ref: '+10% utenti portati',
};

/** Subject of a sentence: "<subject> vale quanto …". */
export const LEVER_SUBJECT: Record<Lever, string> = {
  N: 'Comprare il 10% di utenti in più',
  CAC: 'Ridurre il CAC del 10%',
  act: 'Portare il 10% di utenti in più all’aha moment',
  ARPA: 'Alzare il prezzo del 10%',
  r1: 'Una toppa sul buco grande',
  c: 'Ridurre il churn del 10%',
  e: 'Spingere l’upsell del 10%',
  ref: 'Spingere il passaparola del 10%',
};

/** How a relative push x of a reference lever reads: "−27% di CAC". */
export function refPhrase(ref: Lever, x: number): string {
  const v = Math.round(x * 100);
  switch (ref) {
    case 'CAC':
      return `−${v}% di CAC`;
    case 'c':
      return `−${v}% di churn`;
    case 'N':
      return `+${v}% di utenti comprati`;
    default:
      return `+${v}% di ${LEVER_BUTTON[ref].toLowerCase().replace(/^più /, '')}`;
  }
}

export const PRESET_LABEL: Record<PresetKey, string> = {
  smb: 'Software per piccole aziende',
  b2b: 'B2B, pochi clienti grandi',
  welfare: 'B2B2C welfare / benefit',
};

export const FIELDS = [
  { key: 'N', label: 'Nuovi utenti al mese', unit: 'utenti', min: 0, max: 100000, step: 10, scale: 1 },
  { key: 'CAC', label: 'Costo per utente acquisito', unit: '€', min: 0, max: 100000, step: 10, scale: 1 },
  { key: 'act', label: 'Arrivano all’aha moment e pagano', unit: '%', min: 0, max: 100, step: 1, scale: 100 },
  { key: 'ARPA', label: 'Ricavo mensile per cliente', unit: '€', min: 0, max: 100000, step: 1, scale: 1 },
  { key: 'r1', label: 'Restano dopo il primo mese', unit: '%', min: 0, max: 100, step: 1, scale: 100 },
  { key: 'c', label: 'Churn mensile dal secondo mese', unit: '%', min: 0, max: 100, step: 0.5, scale: 100 },
  { key: 'e', label: 'Upsell mensile sui clienti attivi', unit: '%', min: 0, max: 10, step: 0.1, scale: 100 },
  { key: 'ref', label: 'Utenti portati da 100 clienti al mese', unit: 'utenti', min: 0, max: 10, step: 0.5, scale: 100 },
  { key: 'gm', label: 'Margine lordo', unit: '%', min: 0, max: 100, step: 1, scale: 100 },
] as const;

export const ASSUMPTIONS = [
  'Ogni mese entrano utenti comprati (a CAC costante) e utenti portati dal passaparola (gratis).',
  'Solo chi arriva all’aha moment paga. Gli altri escono subito.',
  'Se compri il 10% di utenti in più, quelli in più arrivano all’aha moment la metà delle volte: spesso sono meno interessati.',
  'Dopo il primo mese il churn è costante. Nessuna stagionalità, nessun limite di mercato, prezzo e margine fissi.',
  'L’upsell fa crescere il ricavo dei clienti che restano, ogni mese della stessa percentuale.',
  'Confronto le leve sul valore creato: margine meno costo di acquisizione nei 24 mesi, più il margine che i clienti ancora attivi daranno nei 36 mesi dopo. Niente sconto finanziario.',
  'È un modello per ragionare, non una previsione.',
];
