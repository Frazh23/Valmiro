# Valmiro

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
  zone-omi.json                  43 poligoni ufficiali 2025/2 (anche .geojson per QGIS/PostGIS)
  zone-omi-semplificate.json     stessi poligoni a 3.818 vertici, per la mappa nel browser
  quotazioni-omi-2025-2.json     42 zone × 4 tipologie × 2 stati + box (2024-2 resta per confronto)
  locazioni-omi-2025-2.json      i canoni, stesso tracciato
  fornitura/AAAA-S/              le forniture QIP dell'Agenzia com'e' arrivate: VALORI, ZONE, KML
  nomi-zone.json                 275 tra vie, piazze e quartieri → zona (euristica)
src/lib/engine.ts                il motore: modulo puro, nessuna rete, nessun database
src/lib/geo.ts                   point-in-polygon, coordinate → zona
src/lib/geocode.ts               indirizzo → coordinate (Nominatim o TomTom)
src/app/api/geocode/route.ts     GET  /api/geocode?q=via Solari 21
src/app/api/estimate/route.ts    POST /api/estimate
src/app/page.tsx                 il flusso a cinque passi
src/components/Mappa.tsx         mappa delle zone disegnata dai poligoni, click → zona
scripts/ingest-omi.mjs           aggiornamento automatico via API CKAN del Comune
src/lib/affitto.ts               canone e rendita dai canoni OMI; andamento della zona dal 2014
scripts/ingest-storico.mjs       dal riepilogo OMI 2004-2024 ai canoni e allo storico per zona
scripts/load-postgis.mjs         caricamento in Postgres, opzionale
db/schema.sql                    schema con storico dei semestri e tabella delle stime
tests/*.test.mjs                 invarianti sui dati: quotazioni, geometrie, indirizzario, canoni, storico
```

## Come funziona la stima

1. **Base di zona.** L'OMI pubblica due fasce per tipologia, NORMALE e OTTIMO. Prendiamo
   le loro mediane: la prima è l'immobile abitabile, la seconda quello in ordine.
2. **Premio di stato.** Il rapporto tra le due mediane è quanto il mercato paga la buona
   conservazione. Preso alla lettera sovrastima, perché dentro ogni fascia c'è anche la
   posizione dentro la zona, che non cambia ristrutturando: lo comprimiamo con
   `COMPRESSIONE_STATO = 0.7` come riferimento storico; **tarato il 5/9/2026 su 201 annunci
   reali**: 0,45 in centro e semicentro (B, C), 0,70 in periferia (D, E), livello +5% in B/C,
   sconto "da ristrutturare" 0,95. Vedi `PARAMETRI` in `engine.ts` e `data/annunci/`.
3. **Aggiornamento a oggi.** `INDICE_ISTAT` porta la base, che esce con mesi di ritardo,
   al trimestre corrente. Va aggiornato ogni trimestre dai dati Istat.
4. **Superficie commerciale** secondo il DPR 138/1998, allegato C: la superficie degli
   annunci e degli atti (muri compresi) è la base; se l'utente ha solo la calpestabile si
   aggiunge il 12% di muri, dichiarato come media. Balconi e terrazzi, chiesti separati in
   m², contano insieme al 30% fino a 25 m² e al 10% oltre; la cantina 2,5 m². Se sono già
   dentro la commerciale inserita non si contano due volte. Ogni contributo è una riga del
   dettaglio.
5. **Coefficienti** su piano, ascensore, classe energetica, luminosità e — se l'utente
   risponde alle domande di affinamento — epoca, affaccio, distanza dalla metropolitana.
6. **Incertezza.** Non è una costante: nasce dall'ampiezza della fascia OMI di quella
   zona, cresce se lo stato è incerto, cala a ogni domanda di affinamento risposta.

Il risultato è sempre un **intervallo**, mai un numero secco, con la fonte e il semestre
dichiarati accanto.

## Comprare o vendere

Il percorso chiede prima da che parte si sta. **Il valore è lo stesso**: il motore non sa
nemmeno quale intento sia stato scelto (`Input.intento` è solo informativo). Cambiano le
parole e gli strumenti: chi compra incolla l'annuncio, inserisce il prezzo richiesto e
legge «È caro o no?» con un intervallo per l'offerta che ha un criterio esplicito (la metà
bassa dell'intervallo di stima); chi vende inserisce il prezzo che aveva in mente e legge
valore stimato e **prezzo di pubblicazione possibile**, che è la mediana osservata sugli
annunci di taratura (il 6% sopra il valore), presentata come comportamento dei venditori e
non come consiglio. Nessuna percentuale di trattativa è presentata come evidenza di mercato.
L'intento si cambia in ogni passo senza perdere i dati e resta nella stima salvata.

## Ristrutturazione intervento per intervento

`src/lib/ristrutturazione.ts`: nove voci con cosa comprendono e su che base si calcolano
(metri di pavimento, di pareti, bagni, finestre, porte, a corpo), prezzi unitari IVA esclusa
per pacchetto da prezzari 2026 per Milano, moltiplicatore di fascia. I pacchetti Essenziale,
Completa e Design sono una precompilazione: ogni voce si include, si esclude, si segna come
già fatta o si sostituisce con un preventivo (con o senza IVA, con o senza posa). Lo stato
atteso dipende dai lavori che restano: «ottimo» richiede impianti, bagni, pavimenti e
tinteggiatura; «come nuova» anche demolizioni, termico, infissi e porte. Se manca un
lavoro necessario, il valore atteso scende e la pagina dice perché. La classe energetica
non viene stimata. La detrazione (50%/36%, tetto 96.000, dieci rate) si applica alla spesa
sostenuta e viene distinta dalla liquidità necessaria. Al cambio pacchetto restano solo
«già fatto» e «non lo faccio», i preventivi si azzerano, e lo si dice.

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

Se invece hai la **fornitura ufficiale dell'Agenzia** (i tre file QIP: `*_VALORI.csv`,
`*_ZONE.csv`, `F205.kml`), la strada è un'altra e fa tutto:

```bash
npm run ingest-fornitura data/fornitura/2025-2/QIP_2025-2_VALORI.csv data/fornitura/2025-2/QIP_2025-2_ZONE.csv data/fornitura/2025-2/F205.kml
```

Scrive quotazioni, canoni, perimetri (interi e semplificati) e aggiunge il semestre allo
storico; stampa zone nuove o mancanti, quanto si sono mosse le quotazioni e quali
perimetri sono cambiati. Un semestre **più vecchio** di quello in produzione va solo in
archivio e nello storico: perimetri e file correnti non si toccano. Se un perimetro è cambiato, rigenera anche l'indirizzario
(`npm run ingest-civici`), perché la zona di ogni civico è calcolata una volta sola. Poi
`SEMESTRE`, `INDICE_ISTAT` (la base Istat cambia con il semestre) e, in
`src/lib/affitto.ts`, l'import dei canoni e `SEMESTRE_LOCAZIONI`. Infine `npm run
calibra`: con una base nuova il livello per fascia può cambiare, ed è successo nel
2025/2 (centro da 1,05 a 1,02).

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
2. **Tarare** `COMPRESSIONE_STATO` e i coefficienti su 40-50 annunci milanesi reali
   (strumento pronto: `npm run calibra`, annunci in `data/annunci/`, vedi il README lì),
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
- `src/styles/valmiro.css` — i componenti del linguaggio Valmiro.
- `src/components/valmiro/` — i componenti React.

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
