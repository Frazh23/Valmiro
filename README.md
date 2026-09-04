# Vaylo

Stima del valore di un immobile a Milano sulle **quotazioni ufficiali OMI** dell'Agenzia
delle Entrate, con i perimetri veri delle 42 zone e un motore di stima trasparente:
ogni euro del risultato è spiegato da una riga del calcolo.


---

## Avvio in tre comandi

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # invarianti sui dati + point-in-polygon
```

Poi copia `.env.example` in `.env.local` e metti un contatto reale in `GEOCODER_UA`:
Nominatim lo richiede, e senza rischi di essere bloccato.

> **Nota onesta:** questo progetto è stato scritto in un ambiente senza accesso a npm,
> quindi `next build` non è mai stato eseguito. La logica pura — motore, dati, geometrie —
> è invece compilata e testata: `npm test` passa. Se al primo avvio l'interfaccia dà
> errore, quasi certamente è una sciocchezza di import o di tipi: mandami l'errore.

---

## Cosa c'è dentro

```
data/                            i dati veri, versionati con il codice
  zone-omi.json                  43 poligoni ufficiali (anche .geojson per QGIS/PostGIS)
  zone-omi-semplificate.json     stessi poligoni a 3.732 vertici, per la mappa nel browser
  quotazioni-omi-2024-2.json     42 zone × 4 tipologie × 2 stati + box
  nomi-zone.json                 275 tra vie, piazze e quartieri → zona (euristica)
src/lib/engine.ts                il motore: modulo puro, nessuna rete, nessun database
src/lib/geo.ts                   point-in-polygon, coordinate → zona
src/lib/geocode.ts               indirizzo → coordinate (Nominatim o TomTom)
src/app/api/geocode/route.ts     GET  /api/geocode?q=via Solari 21
src/app/api/estimate/route.ts    POST /api/estimate
src/app/page.tsx                 il flusso a cinque passi
src/components/Mappa.tsx         mappa delle zone disegnata dai poligoni, click → zona
scripts/ingest-omi.mjs           aggiornamento automatico via API CKAN del Comune
scripts/load-postgis.mjs         caricamento in Postgres, opzionale
db/schema.sql                    schema con storico dei semestri e tabella delle stime
tests/engine.test.mjs            invarianti sui dati e sulle geometrie
```

## Come funziona la stima

1. **Base di zona.** L'OMI pubblica due fasce per tipologia, NORMALE e OTTIMO. Prendiamo
   le loro mediane: la prima è l'immobile abitabile, la seconda quello in ordine.
2. **Premio di stato.** Il rapporto tra le due mediane è quanto il mercato paga la buona
   conservazione. Preso alla lettera sovrastima, perché dentro ogni fascia c'è anche la
   posizione dentro la zona, che non cambia ristrutturando: lo comprimiamo con
   `COMPRESSIONE_STATO = 0.7`. **È il primo parametro da tarare sui comparabili reali.**
3. **Aggiornamento a oggi.** `INDICE_ISTAT` porta la base, che esce con mesi di ritardo,
   al trimestre corrente. Va aggiornato ogni trimestre dai dati Istat.
4. **Coefficienti** su piano, ascensore, classe energetica, luminosità e — se l'utente
   risponde alle domande di affinamento — epoca, affaccio, distanza dalla metropolitana.
5. **Incertezza.** Non è una costante: nasce dall'ampiezza della fascia OMI di quella
   zona, cresce se lo stato è incerto, cala a ogni domanda di affinamento risposta.

Il risultato è sempre un **intervallo**, mai un numero secco, con la fonte e il semestre
dichiarati accanto.

## Aggiornare i dati

```bash
npm run ingest -- --dry     # guarda se è uscito un semestre nuovo, senza scrivere
npm run ingest              # scarica e riscrive data/
```

Il portale del Comune espone un'API CKAN pubblica senza chiave: lo script si accorge da
solo quando esce un semestre nuovo. Gli URL delle risorse cambiano a ogni pubblicazione,
per questo non sono mai scritti nel codice. **Cron consigliato: una volta a settimana** —
le quotazioni escono due volte l'anno ma senza data certa.

Dopo un ingest riuscito: aggiorna l'import e `SEMESTRE` in `src/lib/data.ts`, rilancia
`npm test`, e solo allora pubblica.

## Database (opzionale)

L'app legge dai file e funziona senza. Quando servono query spaziali vere, storico e
salvataggio delle stime:

```bash
npm i pg
export DATABASE_URL=postgresql://...       # Supabase va benissimo
npm run load-db
```

Regola dello schema: **le quotazioni non si aggiornano mai**, si aggiunge il semestre e
si lasciano i vecchi. Ti dà storico, ricostruzione delle stime passate e rollback.

## Le tre cose da fare dopo

1. **Salvare ogni stima** nella tabella `stime`, con indirizzo, caratteristiche e prezzo
   esposto dichiarato. È il dataset proprietario: cresce da solo e nessuno può comprarlo.
2. **Tarare** `COMPRESSIONE_STATO` e i coefficienti su 40-50 annunci milanesi reali,
   misurando lo scarto medio. Con OMI più coefficienti, un errore del 10-12% è onesto.
3. **Passare a un geocoder a consumo** quando il traffico supera i limiti di Nominatim.
   Si cambia solo `src/lib/geocode.ts`.

## Licenza dei dati

Quotazioni e perimetri: Agenzia delle Entrate — Osservatorio del Mercato Immobiliare,
via il portale open data del Comune di Milano, **CC BY 4.0**. La fonte va citata in ogni
pagina che mostra un valore: è già nel disclaimer sotto il risultato.

Le stime prodotte sono indicative e non costituiscono perizia né valutazione ai sensi
degli standard estimativi. Non toglierlo.

---

## Struttura del frontend

Il livello visuale vive in tre posti e in nessun altro:

- `src/styles/tokens.css` — colori, spazi, raggi, tipografia, ombre, durate. Unica fonte di verità.
- `src/styles/vaylo.css` — i componenti del linguaggio Vaylo.
- `src/components/vaylo/` — i componenti React.

`src/app/globals.css` contiene gli stili delle schermate non ancora riprogettate
(/stime, /accedi, mappa) ed è in via di smantellamento: non aggiungere nulla lì.

## Documentazione

- `CLAUDE.md` — le regole del progetto. La prima: la logica di business non si riscrive.
- `docs/design-system.md` — il linguaggio visuale.
- `docs/v0-brief.md` — il brief da incollare in v0 a ogni iterazione.
- `docs/workflow.md` — il ciclo Claude ↔ v0 ↔ GitHub ↔ Vercel, i rami, la lista di revisione.

## Comandi

```bash
npm run dev        # sviluppo
npm run typecheck  # tsc --noEmit
npm test           # test del motore
npm run build      # build di produzione
```
