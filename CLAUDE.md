# Valmiro — regole del progetto

Valmiro stima il valore di un immobile a Milano sulle quotazioni ufficiali OMI
dell'Agenzia delle Entrate. Questo file vale per chiunque tocchi il codice:
Claude, v0, o una persona.

## La regola che viene prima di tutte

**La logica di business esiste già e non si riscrive.**
Il motore di stima, l'integrazione Supabase, l'autenticazione e i parametri di
valutazione sono funzionanti e tarati. Il frontend li *consuma*.

Se una schermata ha bisogno di un numero, quel numero:

1. esiste già in `src/lib/engine.ts` → si legge;
2. non esiste → si aggiunge **al motore**, con un test, non nel componente.

Non è mai accettabile che un componente calcoli un prezzo, un costo, una
percentuale o una detrazione. Nemmeno "solo per la demo".

## Dove sta cosa

| Cosa | Dove | Chi lo tocca |
|---|---|---|
| Motore di stima (puro, testato) | `src/lib/engine.ts` | solo con un test che lo copre |
| Quotazioni, zone, nomi | `src/lib/data.ts`, `data/*.json` | rigenerati da `scripts/ingest-omi.mjs` |
| Point-in-polygon, geocoding | `src/lib/geo.ts`, `src/lib/geocode.ts` | — |
| API | `src/app/api/estimate`, `src/app/api/geocode` | contratto stabile |
| Supabase, sessione, profili | `src/lib/supabase.ts`, `src/lib/sessione.ts` | non riscrivere |
| Salvataggio stime | `src/lib/storage.ts` | localStorage + tabella `stime` |
| Token visuali | `src/styles/tokens.css` | unica fonte di verità visuale |
| Componenti Valmiro | `src/components/sistema/` | qui va il nuovo |
| Stili legacy | `src/app/globals.css` | in via di smantellamento |

## Come si consuma il motore dal frontend

- Stima: `POST /api/estimate` con un `Input` (vedi `src/lib/types.ts`).
- Ristrutturazione: stessa chiamata con `{ ristrutturazione: "base"|"completa"|"design", primaCasa }`.
- Più scenari: più chiamate in parallelo. Il motore è puro, costano niente.
- Geocodifica: `GET /api/geocode?q=…`. Ripiega sul dizionario locale e lo dichiara in `metodo`.

## Vincoli non negoziabili

- **Chiavi.** Solo la chiave *publishable* di Supabase sta nel client; è protetta da RLS.
  La chiave `service_role` non entra mai nel repository né nel browser.
- **Disclaimer.** Accanto a ogni risultato: stima automatica indicativa, non è una perizia,
  con l'attribuzione CC BY 4.0 all'Agenzia delle Entrate via Comune di Milano.
- **Portali.** Non si fa scraping di immobiliare.it o simili: violano i termini d'uso
  e la tutela sui generis delle banche dati.
- **Dati personali.** Indirizzo ed email sono dati personali: non finiscono nei log,
  né in query string verso terzi.
- **Rete.** La build deve funzionare senza rete: niente `next/font/google`, niente
  asset remoti obbligatori.
- **v0 è uno strumento di sviluppo.** Non viene chiamato a runtime, non compare nei
  flussi utente, il sito non ne dipende.

## Prima di considerare finito un lavoro

```bash
npm run typecheck   # tsc --noEmit
npm test            # test del motore
npm run build       # deve compilare
```
