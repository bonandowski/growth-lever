# Il secchio che perde

Un simulatore delle leve di crescita per prodotti in abbonamento (B2B e SMB). Risponde a una domanda: **con i miei numeri, dove conviene spingere?**

Il prodotto è un secchio. Entrano utenti (acquisizione, a un CAC), solo una parte arriva all'aha moment e paga (activation), i clienti escono (churn M1 e churn mensile), quelli che restano crescono (expansion) e portano altri utenti gratis (referral). Gli otto pulsanti sotto la scena applicano un +10% a una leva alla volta e mostrano quanto vale, anche rispetto a una riduzione del CAC.

Si parte da una schermata che chiede il tipo di business: SaaS B2B product-led, SaaS B2B sales-led, app B2C in abbonamento, e-commerce D2C, news con abbonamento. Ogni tipo carica ordini di grandezza presi da report pubblici, arrotondati e con fonte. Ogni numero è segnato come *fonte*, *derivato* (calcolato da un benchmark), *stima* (nessuna fonte affidabile) o *esempio* (dipende dalla dimensione dell'azienda). La tabella con i link è in pagina, sotto "Come ragiona il modello", ed è definita in `src/presets.ts`. Un link con `?p=<tipo>` salta l'onboarding.

Nessun backend, nessun cookie, nessun numero salvato o inviato: il calcolo resta nel browser. L'unica cosa che il browser ricorda (localStorage) è che hai già visto il finto paywall, per non mostrarlo di nuovo. L'unica cosa esterna è Vercel Web Analytics (visite aggregate, senza cookie e senza dati personali).

Ispirato a *Growth Levers and How to Find Them* di Matt Lerner.

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest: modello e stato nell'URL
npm run build    # typecheck + build statica in dist/
```

Struttura:

- `src/model.ts`: modello puro (simulazione per coorti, leve, bisezione, frase insight). Nessun DOM, nessun React.
- `src/model.test.ts`, `src/url.test.ts`: test.
- `src/presets.ts`: i 5 tipi di business, con numeri di partenza e fonti.
- `src/copy.ts`: tutti i testi (solo italiano).
- `src/url.ts`: lo stato vive nei parametri dell'URL (`?p=b2bPlg&leva=c`, più i numeri uno per uno se modificati). Senza parametri si apre l'onboarding.
- `src/components/`: `Onboarding`, `Bucket` (la scena SVG), `LeverButtons` + `LeverIcon`, `NumbersPanel`.
- `public/fonts/`: Fraunces (licenza OFL), servito dal sito stesso.

## Il modello in breve

Mese per mese, per 24 mesi:

- nuovi utenti = N (acquisizione a pagamento, costo N × CAC) + referral × clienti attivi del mese prima (costo zero);
- nuovi clienti = nuovi utenti × activation;
- un cliente di età *a* resta con probabilità 1 per *a* = 0, retention M1 × (1 − churn)^(*a*−1) dopo;
- ricavo per cliente = ARPA × (1 + expansion)^*a*.

Le leve si confrontano sul **valore creato**: margine lordo meno CAC nei 24 mesi, più il margine che i clienti ancora attivi al mese 24 daranno nei 36 mesi successivi. Con +10% di acquisizione, gli utenti in più hanno metà dell'activation attuale. Tutte le ipotesi sono anche nella pagina, sotto "Come ragiona il modello".

## Deploy su Vercel

È un sito statico (Vite). Ci sono due strade.

**Con la CLI**

```bash
npm i -g vercel
vercel login
vercel          # primo deploy di anteprima: accetta i default (framework Vite, output dist)
vercel --prod   # pubblica in produzione
```

**Collegando GitHub**

1. Su vercel.com: *Add New → Project*, scegli il repository `growth-lever`.
2. Lascia i default: framework Vite, build `npm run build`, output `dist` (sono anche in `vercel.json`).
3. *Deploy*. Ogni push sul branch di produzione pubblica il sito; ogni altro branch o PR ha un'anteprima.

**Analytics**: nel progetto Vercel apri *Analytics* e attiva Web Analytics. Senza questo passo lo script non raccoglie niente (e in locale risponde 404, è normale).

**Verifica dopo il deploy**

- la pagina si apre con il secchio animato e la frase in alto;
- dall'onboarding scegli un tipo: si apre il secchio con i numeri di quel tipo;
- premi "Churn −10%": la frase cambia, compare la toppa e l'URL diventa `?p=<tipo>&leva=c`;
- "cambia" in alto riporta all'onboarding;
- copia l'URL dalla barra del browser e aprilo in un'altra finestra: stesso stato;
- "Usa i miei numeri": cambia il CAC e controlla che frase e secchio si aggiornino;
- Lighthouse (Chrome DevTools, mobile) su performance e accessibilità.
