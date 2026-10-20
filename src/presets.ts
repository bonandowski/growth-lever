import type { Inputs } from './model';

// Starting numbers for five kinds of digital business. Orders of magnitude from public
// reports (see SOURCES), rounded. N is an example: it depends on company size.

export const PRESETS = {
  b2bPlg: { N: 2000, CAC: 30, act: 0.08, ARPA: 50, r1: 0.9, c: 0.035, e: 0.01, ref: 0.02, gm: 0.8 },
  b2bSales: { N: 60, CAC: 7000, act: 0.22, ARPA: 2500, r1: 0.98, c: 0.01, e: 0.015, ref: 0.005, gm: 0.77 },
  b2cApp: { N: 20000, CAC: 1.25, act: 0.017, ARPA: 10, r1: 0.7, c: 0.1, e: 0.002, ref: 0.02, gm: 0.7 },
  ecommerce: { N: 20000, CAC: 0.9, act: 0.025, ARPA: 40, r1: 0.28, c: 0.1, e: 0.005, ref: 0.02, gm: 0.47 },
  news: { N: 200000, CAC: 0.05, act: 0.002, ARPA: 10, r1: 0.8, c: 0.05, e: 0.005, ref: 0.005, gm: 0.7 },
} satisfies Record<string, Inputs>;

export type PresetKey = keyof typeof PRESETS;
export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];
export const DEFAULT_PRESET: PresetKey = 'b2bPlg';

export type Origin = 'fonte' | 'derivato' | 'stima' | 'esempio';
export interface Source {
  metric: string;
  value: string;
  origin: Origin;
  note: string;
  url?: string;
}

export const SOURCES: Record<PresetKey, Source[]> = {
  b2bPlg: [
    { metric: 'Nuovi signup', value: '2.000/mese', origin: 'esempio', note: 'dipende dalla dimensione dell’azienda' },
    { metric: 'Activation', value: '8%', origin: 'fonte', note: 'mediana free→paid, ChartMogul Conversion Report', url: 'https://chartmogul.com/reports/saas-conversion-report-2/' },
    { metric: 'CAC', value: '€30 per signup', origin: 'derivato', note: 'payback mediano ~9 mesi per ACV basso (Benchmarkit, via SaaS Hero)', url: 'https://saashero.net/customer-retention/cac-payback-period-benchmarks-saas/' },
    { metric: 'ARPA', value: '€50/mese', origin: 'esempio', note: 'piano self-serve tipico' },
    { metric: 'Retention M1', value: '90%', origin: 'stima', note: 'nessuna fonte pubblica affidabile' },
    { metric: 'Churn mensile', value: '3,5%', origin: 'fonte', note: 'SMB 3–5% al mese, dataset di 939 aziende B2B (via UserJot)', url: 'https://userjot.com/blog/saas-churn-rate-benchmarks' },
    { metric: 'Expansion', value: '1%/mese', origin: 'stima', note: 'prudente rispetto agli NRR pubblicati' },
    { metric: 'Referral', value: '2 ogni 100 clienti', origin: 'stima', note: 'nessuna fonte pubblica affidabile' },
    { metric: 'Gross margin', value: '80%', origin: 'fonte', note: 'mediana software 2025, Aleph × Benchmarkit (via Orb)', url: 'https://www.withorb.com/blog/saas-growth-margin-statistics' },
  ],
  b2bSales: [
    { metric: 'Opportunità qualificate', value: '60/mese', origin: 'esempio', note: 'dipende dalla dimensione dell’azienda' },
    { metric: 'Activation (win rate)', value: '22%', origin: 'fonte', note: 'mediana 21–24% su opportunità qualificate (Gong, Salesforce, via The Starr Conspiracy)', url: 'https://www.thestarrconspiracy.com/insights/benchmarks/b2b-go-to-market-strategy-benchmarks-2025' },
    { metric: 'CAC', value: '€7.000 per opportunità', origin: 'derivato', note: 'payback 14–18 mesi nel mid-market (via SaaS Hero)', url: 'https://saashero.net/customer-retention/cac-payback-period-benchmarks-saas/' },
    { metric: 'ARPA', value: '€2.500/mese', origin: 'esempio', note: 'contratto da ~€30K l’anno' },
    { metric: 'Retention M1', value: '98%', origin: 'stima', note: 'contratti annuali: poche uscite nel primo mese' },
    { metric: 'Churn mensile', value: '1%', origin: 'fonte', note: 'enterprise sotto 1,5% al mese (Focus Digital)', url: 'https://focus-digital.co/average-churn-rate-by-industry-saas/' },
    { metric: 'Expansion', value: '1,5%/mese', origin: 'derivato', note: 'coerente con NRR ~110% e churn 1%' },
    { metric: 'Referral', value: '0,5 ogni 100 clienti', origin: 'stima', note: 'nessuna fonte pubblica affidabile' },
    { metric: 'Gross margin', value: '77%', origin: 'fonte', note: 'mediana subscription, KeyBanc SaaS Survey (via Kellblog)', url: 'https://kellblog.com/2022/10/30/key-takeaways-from-the-2022-keybanc-saas-metrics-survey/' },
  ],
  b2cApp: [
    { metric: 'Install', value: '20.000/mese', origin: 'esempio', note: 'dipende dalla dimensione dell’app' },
    { metric: 'Activation', value: '1,7%', origin: 'fonte', note: 'download→pagante in 30 giorni, mediana RevenueCat 2024', url: 'https://www.saastr.com/revenuecat-free-trials-are-way-up-pricing-is-stable-in-mobile-subscriptions/' },
    { metric: 'CAC', value: '€1,25 per install', origin: 'derivato', note: 'CPI pagato ~$1–5 (Liftoff, Adjust), dimezzato perché metà degli install è organica', url: 'https://www.pocketgamer.biz/news/83559/att-continues-taking-a-toll-the-cheapest-cpi-on-apple-still-costs-more-than-the-priciest-on-android/' },
    { metric: 'ARPA', value: '€10/mese', origin: 'esempio', note: 'abbonamento mensile tipico' },
    { metric: 'Retention M1', value: '70%', origin: 'fonte', note: 'quasi il 30% cancella entro il primo mese, RevenueCat 2025', url: 'https://www.revenuecat.com/state-of-subscription-apps-2025/' },
    { metric: 'Churn mensile', value: '10%', origin: 'fonte', note: '~9% medio al mese attribuito a RevenueCat 2025 (via Foundry)', url: 'https://www.builtbyfoundry.io/blog/creator-app-benchmarks-numbers-to-hit-2026' },
    { metric: 'Expansion', value: '0,2%/mese', origin: 'stima', note: 'poco upsell nelle app consumer' },
    { metric: 'Referral', value: '2 ogni 100 clienti', origin: 'stima', note: 'nessuna fonte pubblica affidabile' },
    { metric: 'Gross margin', value: '70%', origin: 'stima', note: 'dopo le commissioni degli store (15–30%)' },
  ],
  ecommerce: [
    { metric: 'Visite', value: '20.000/mese', origin: 'esempio', note: 'dipende dalla dimensione del negozio' },
    { metric: 'Activation (conversione)', value: '2,5%', origin: 'fonte', note: 'medie di settore 2–3% (Smart Insights, Dynamic Yield)', url: 'https://www.smartinsights.com/ecommerce/ecommerce-analytics/ecommerce-conversion-rates/' },
    { metric: 'CAC', value: '€0,90 per visita', origin: 'derivato', note: 'CAC per cliente €70–85 (Eightx), metà del traffico organico', url: 'https://eightx.co/blog/average-cac-ecommerce-vertical' },
    { metric: 'ARPA', value: '€40/mese', origin: 'stima', note: 'scontrino ~€80 (Eightx), un acquisto ogni due mesi', url: 'https://eightx.co/blog/average-aov-by-ecommerce-vertical' },
    { metric: 'Retention M1 (riacquisto)', value: '28%', origin: 'fonte', note: 'tasso di riacquisto DTC medio ~28% (Polar Analytics)', url: 'https://www.polaranalytics.com/post/repeat-purchase-rate-ecommerce' },
    { metric: 'Churn mensile', value: '10%', origin: 'stima', note: 'clienti che smettono di ricomprare' },
    { metric: 'Expansion', value: '0,5%/mese', origin: 'stima', note: 'carrello che cresce nei clienti fedeli' },
    { metric: 'Referral', value: '2 ogni 100 clienti', origin: 'stima', note: 'nessuna fonte pubblica affidabile' },
    { metric: 'Gross margin', value: '47%', origin: 'fonte', note: 'mediana da bilanci 10-K di brand DTC (Eightx)', url: 'https://eightx.co/blog/average-ecommerce-profit-margins' },
  ],
  news: [
    { metric: 'Visite', value: '200.000/mese', origin: 'esempio', note: 'dipende dalla testata' },
    { metric: 'Activation (abbonamento)', value: '0,2%', origin: 'fonte', note: 'conversione media ~0,2%, Piano Subscription Benchmark (via MediaPost)', url: 'https://www.mediapost.com/publications/article/363006/hard-paywalls-have-higher-conversion-rates-than-so.html' },
    { metric: 'CAC', value: '€0,05 per visita', origin: 'stima', note: 'gran parte del traffico è organico' },
    { metric: 'ARPA', value: '€10/mese', origin: 'fonte', note: 'mediana USA $16/mese, il 41% paga meno del prezzo pieno (Reuters Institute DNR 2024, via Nieman Lab)', url: 'https://www.niemanlab.org/2024/06/many-people-dont-pay-full-price-for-their-news-subscription-most-dont-want-to-pay-anything-at-all/' },
    { metric: 'Retention M1', value: '80%', origin: 'fonte', note: 'churn del primo mese ~20%, Piano (via Press Gazette)', url: 'https://pressgazette.co.uk/media-subscription-trends-report-piano/' },
    { metric: 'Churn mensile', value: '5%', origin: 'fonte', note: '~5% dopo i primi mesi, Piano (via Press Gazette)', url: 'https://pressgazette.co.uk/media-subscription-trends-report-piano/' },
    { metric: 'Expansion', value: '0,5%/mese', origin: 'stima', note: 'fine delle promo e passaggio al prezzo pieno' },
    { metric: 'Referral', value: '0,5 ogni 100 clienti', origin: 'stima', note: 'nessuna fonte pubblica affidabile' },
    { metric: 'Gross margin', value: '70%', origin: 'stima', note: 'solo digitale, senza carta' },
  ],
};
