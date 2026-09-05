# Protocollo di verifica indipendente

*Scritto il 5 settembre 2026, prima che esista un campione di verifica. È un requisito
metodologico, non la correzione di un errore trovato nei calcoli: i numeri oggi dichiarati
nella pagina del risultato sono calcolati sul campione di taratura (vedi `docs/taratura.md`)
e sono ottimistici per costruzione. Questo documento dice come si ottengono numeri che non lo
siano, e cosa non conta come verifica.*

## Perché l'API di Idealista non basta

Un lotto nuovo di annunci non è automaticamente un campione di verifica. Diventa tale solo se
(a) non contiene case già usate per tarare, nemmeno ripubblicate; (b) il modello è stato
fissato *prima* di guardarlo; (c) nessun parametro viene scelto guardandolo. Se manca una di
queste condizioni si sta ancora tarando, con un nome diverso.

## Le regole

### 1. Taratura e verifica sono lotti separati

- Ogni lotto è un file `data/annunci/AAAA-MM-GG-<fonte>.csv` (tracciato in
  `data/annunci/README.md`). Un lotto **di verifica** ha `-verifica` nel nome:
  `2026-10-01-idealista-verifica.csv`. Tutto il resto è taratura.
- Un lotto nato come verifica non cambia mai ruolo. Se lo si vuole usare per tarare, lo si
  copia con un altro nome e si accetta che da quel momento serve un *nuovo* lotto di verifica.
- **Duplicati e ripubblicazioni, anche fra portali.** Lo stesso appartamento compare su più
  portali, spesso con metri arrotondati e prezzo ritoccato, e torna sullo stesso portale
  ribassato. Prima di misurare, `scripts/verifica.mjs` toglie dal lotto di verifica ogni
  annuncio che è "la stessa casa" di un annuncio di taratura o di un altro annuncio di
  verifica, su due livelli:
  1. **identificativo**: stessa `fonte` e stesso `rif` (il riferimento dell'annuncio sul
     portale, colonna facoltativa dell'archivio; `npm run idealista` lo compila);
  2. **somiglianza**: stesso indirizzo (normalizzato: senza «via», accenti, punteggiatura),
     metri entro il 3%, prezzo entro il 2%.
  Questo filtro è un primo passaggio, **non una garanzia**: la stessa casa può tornare con
  un prezzo ribassato del 5% o con i metri "commerciali" al posto dei "calpestabili". Per
  questo il rapporto elenca, uno per uno, i **possibili duplicati da rivedere a mano**
  (stesso indirizzo e metri o prezzo entro il 10%), tenuti nel campione finché qualcuno non
  li rilegge: se uno è la stessa casa, si toglie dal CSV e si rilancia. Gli **immobili
  diversi nello stesso stabile** (stesso indirizzo, metri lontani) restano nel campione
  come case distinte e il rapporto ne dà il conto: sono legittimi, ma condividono zona e
  palazzo, quindi non sono osservazioni del tutto indipendenti.
- Gli annunci senza indirizzo risolvibile in una zona OMI non entrano: non si stimano.

### 2. Il modello si fissa prima di guardare i dati

- `npm run verifica -- --congela` scrive `data/annunci/parametri-congelati.json` con
  parametri (`PARAMETRI`), coefficienti (`COEFF`, `COMPRESSIONE_STATO`), semestre OMI, indice
  Istat, data e commit, più un'impronta SHA-256.
- Il congelamento va fatto **prima** di scaricare o aprire il lotto di verifica. Il commit del
  congelamento è la prova: il lotto di verifica deve avere una data successiva.
- `npm run verifica` rifiuta di misurare se l'impronta attuale del motore non coincide con
  quella congelata. Un motore ritoccato dopo aver visto la verifica non è più fuori campione.

### 3. Il campione di verifica non sceglie i coefficienti

- `scripts/verifica.mjs` non contiene nessuna ricerca di parametri: misura e basta.
- Se la verifica mostra un errore sistematico, la correzione passa da `npm run calibra` sui
  soli lotti di taratura (a cui si possono *aggiungere* nuovi lotti di taratura, non quelli di
  verifica), poi si ricongela e si raccoglie un lotto di verifica nuovo. Il lotto di verifica
  "bruciato" resta nell'archivio con il suo nome, ma i suoi numeri non si citano più come
  fuori campione.
- Niente eccezioni "solo per questo esempio": la regola che vale per i coefficienti vale
  anche per le soglie dell'interfaccia (intervalli, giudizi caro/conveniente).

### 4. La metrica riguarda prezzi richiesti, finché non ci sono compravendite

- Con `prezzo_venduto` vuoto, il confronto è ln(prezzo richiesto / prezzo di pubblicazione
  stimato), come in taratura. Il rapporto scrive in testa: *«questi numeri dicono quanto le
  stime somigliano a ciò che i venditori chiedono, non a ciò che gli acquirenti pagano»*, e
  la pagina del risultato deve dirlo con le stesse parole.
- Con `prezzo_venduto` pieno il confronto è ln(prezzo venduto / valore centrale). Un lotto
  misto va separato in due prima di citare qualunque numero: il rapporto lo segnala.
- Fonti possibili di prezzi effettivi: rogiti forniti da utenti, dati di compravendita
  dell'OMI (aggregati, non per singolo immobile), accordi con agenzie. Nessuna è disponibile
  oggi.

### 5. Il campione si documenta

Ogni misura scrive `docs/verifiche/AAAA-MM-GG.md` con:

- lotti di verifica usati, numero di annunci grezzi, esclusi (per ogni motivo), **misurati**;
- date degli annunci, semestre OMI e indice Istat del motore;
- lotti di taratura tenuti separati, con la loro dimensione;
- impronta e data del congelamento, commit della misura;
- scarto mediano, MAD e quota entro ±10%, in totale e per fascia OMI, stato conservativo e
  tipologia;
- la variabile di confronto (richiesti o venduti), in chiaro.

Sotto i 40 annunci misurati il rapporto marca le metriche per gruppo come indicative. Per
citare un numero nella pagina servono almeno 100 annunci misurati e copertura di tutte le
fasce B, C, D, E con almeno 15 annunci ciascuna: altrimenti si cita il totale e si dice quali
fasce mancano.

## Stato

**Protocollo predisposto; validazione indipendente non ancora eseguita.** Questa dicitura
resta nella pagina del risultato e nel README finché `docs/verifiche/` non contiene un
rapporto su un lotto reale.

## Il piano concreto con l'API di Idealista

1. Oggi: `npm run verifica -- --congela` al commit del motore corrente. Commit.
2. All'arrivo delle chiavi: `npm run idealista -- --verifica` scarica il lotto in
   `data/annunci/AAAA-MM-GG-idealista-verifica.csv`, con la colonna `rif` compilata con il
   codice dell'annuncio sul portale: il lotto nasce già con il suo ruolo. Nessuno apre il
   file per "dare un'occhiata" al motore prima della misura.
3. `npm run verifica` → `docs/verifiche/AAAA-MM-GG.md`. I numeri di quel rapporto
   sostituiscono nella pagina quelli di taratura, con la dicitura «campione di verifica
   indipendente, prezzi richiesti».
4. Se il rapporto suggerisce di ritarare: si fa sui lotti di taratura, si ricongela, si
   raccoglie un lotto nuovo. Il ciclo ricomincia.

## Cosa questo protocollo non risolve

- La qualità dei dati di ingresso: stato conservativo e piano dichiarati dagli annunci sono
  parole di chi vende. Il campione di taratura ha mostrato che «abitabile» nasconde spesso un
  «rinnovato»: una quota del campione di verifica andrebbe riletta a mano, come in taratura.
- La distanza fra richiesto e venduto, che il motore incorpora come convenzione (il 6%) e
  non misura.
- Il segmento di pregio, dove le fasce OMI hanno un tetto che il mercato supera: la verifica
  lo misurerà, non lo correggerà.
