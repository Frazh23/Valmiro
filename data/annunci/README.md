# L'archivio degli annunci

Qui stanno tutti gli annunci reali che abbiamo letto, **un file per lotto**, con il nome
che dice quando e da dove: `2026-09-05-vendite-fz.csv`, `2026-10-01-idealista.csv`.
L'archivio cresce aggiungendo file, mai riscrivendo quelli vecchi: un annuncio del 2026
resta un prezzo del 2026, e un giorno servirà proprio per questo (andamento, comparabili
con data). Gli affitti vanno in file a parte, con `affitti` nel nome, con il canone
mensile in `prezzo_richiesto`.

`npm run calibra` e `npm run comparabili` leggono **solo i lotti di taratura** (un file passato esplicitamente deve essere di taratura; per la verifica usare il comando dedicato). I
duplicati fra lotti — stesso indirizzo, stessi metri, stesso prezzo — vengono tolti
tenendo la lettura più recente. La logica di lettura è in `scripts/annunci.mjs`.

Un annuncio per riga, separatore `;`. Servono **almeno 20 righe** perché la calibrazione
accetti di girare, 40-50 perché il risultato valga qualcosa. Meglio pochi annunci letti
bene che tanti copiati di fretta: ogni colonna sbagliata sposta la taratura.

**Perché serve che cresca.** L'esperimento del 5/9/2026 (`npm run comparabili`) ha
mostrato che con 147 annunci al civico i comparabili vicini tolgono solo un punto e mezzo
di dispersione: per farli lavorare davvero servono migliaia di annunci con data e civico.
Ogni lotto in più avvicina quel momento.

**Da dove prenderli.** A mano, leggendo l'annuncio (un minuto l'uno), oppure con
l'API ufficiale di Idealista tramite `npm run idealista`. Mai con scraping dei
portali: lo vietano i loro termini d'uso e le banche dati sono protette.

**Cosa cercare.** Annunci di Milano città, appartamenti (non ville, non negozi),
distribuiti su zone diverse — centro, semicentro, periferia — e su stati diversi:
almeno un terzo "da ristrutturare" o "abitabile" e un terzo "ristrutturato" o "nuovo",
altrimenti `compressioneStato` non si può tarare. Evitare aste, nuda proprietà,
frazionamenti e annunci senza metratura.

| Colonna | Valori | Note |
|---|---|---|
| `id` | testo libero | univoco, es. `imm-001` |
| `fonte` | `immobiliare`, `idealista`, `casa`, `agenzia`, `altro` | |
| `rif` | testo libero, facoltativo | il codice dell'annuncio sul portale (es. il numero nell'URL): con `fonte` identifica l'annuncio e serve alla verifica per riconoscere le ripubblicazioni (`docs/verifica.md`) |
| `data` | `AAAA-MM-GG` | quando l'hai letto |
| `indirizzo` | `Via Savona 35` | via e civico come nell'annuncio; se manca il civico, solo la via |
| `zona` | `C18` | facoltativa: se vuota la ricava lo script dall'indirizzo |
| `tipo` | `civ` (civile), `sig` (signorile), `eco` (economico) | in dubbio, `civ` |
| `mq` | numero | superficie **commerciale** dell'annuncio |
| `stato` | `rist` (da ristrutturare), `abit` (abitabile/buono), `otti` (ristrutturato/ottimo), `nuov` (nuovo) | |
| `piano` | `terra`, `rialzato`, `1-2`, `3-5`, `6+`, `ultimo` | |
| `ascensore` | `si` / `no` | |
| `classe` | `A`…`G`, `nd` | se l'annuncio dice A1-A4, scrivi `A` |
| `balconi` | numero | 0 se nessuno |
| `cantina` | `si` / `no` | |
| `box` | `nessuno`, `posto`, `box` | solo se **compreso nel prezzo** |
| `epoca` | `ante1945`, `1946-1980`, `1981-2005`, `post2005` o vuoto | |
| `affaccio` | `interno`, `misto`, `strada` o vuoto | |
| `metro` | `vicina` (<400 m), `media`, `lontana` (>1 km) o vuoto | |
| `prezzo_richiesto` | numero, euro | il prezzo dell'annuncio |
| `prezzo_venduto` | numero o vuoto | solo se lo sai davvero (rogito, agente) |
| `note` | testo | tutto quello che non entra nelle colonne |

Il confronto avviene tra `prezzo_richiesto` e il **prezzo di pubblicazione** che
il motore suggerirebbe (`pubblica`), non con il valore centrale: un annuncio è un
prezzo chiesto, non un prezzo fatto. Se c'è `prezzo_venduto`, si confronta con il
valore centrale.

## I lotti presenti

| File | Origine | Stato |
|---|---|---|
| `2026-09-05-vendite-fz.csv` | 201 vendite (da 300 annunci: 90 affitti e 8 duplicati esclusi) raccolte da Francesco il 5/9/2026 facendo cercare gli annunci a un'IA con navigazione, con classe energetica dichiarata e URL di fonte; convertite in questo formato con zona OMI risolta dal civico (147) o dalla via (42) o dal quartiere (12). | **Verificato a campione**: 12 righe riaperte a mano, prezzi e metri confermati in 12/12 (2 da copia indicizzata), 2 correzioni di stato applicate. Due casi atipici veri e tenuti: micro-suite da 21 m² a 380.000 €, loft su tre livelli. Il segmento "Lusso" (77 righe: etichetta del portale, non categoria catastale) è sistematicamente sottostimato dal modello a zone (+14% in mediana, dispersione 19%) e va letto a parte. **È il lotto su cui è stata fatta la taratura del 5/9/2026.** |

## Origine e conversione corrente
Gli originali sono in `grezzi/`. I cosiddetti 100 nuovi NON sono una verifica: 70 vendite sono già in taratura, 30 sono affitti. Vedi `docs/sovrapposizione-campioni.csv`.

Nuove colonne supportate: `mq_balconi`, `mq_terrazzi`, `superficie` (commerciale/calpestabile), `pertinenze_incluse` (si/no), `box_incluso` (si/no). `balconi` resta un conteggio storico: non viene convertito in metri. `classe` accetta anche `nd`; nessuna D implicita. `box` viene incluso solo con `box_incluso=si`; i vecchi lotti senza questa prova vengono segnalati. Queste correzioni alla lettura possono cambiare i risultati delle analisi storiche, non i coefficienti del motore pubblico. I risultati di taratura preesistenti restano risultati del protocollo precedente.

Ruoli, congelamento completo, manifest e regole per pubblicare numeri: `docs/verifica.md`.
