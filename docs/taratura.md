# Taratura del motore: come sono stati ottenuti i numeri dichiarati

*5 settembre 2026. Vale per i numeri che compaiono nella pagina del risultato («Fonti,
note e la tua stima») e nel README.*

## Dati usati

`data/annunci/2026-09-05-vendite-fz.csv`: **201 annunci di vendita** di appartamenti a
Milano, raccolti il 5 settembre 2026 da Francesco Zambelli facendo cercare gli annunci sui
portali a un assistente con navigazione (300 annunci in origine: 90 affitti e 8 duplicati
esclusi). Ogni riga ha indirizzo (147 al civico, 42 alla via, 12 al quartiere), metri
commerciali dichiarati, stato conservativo, piano, ascensore, classe energetica, prezzo
richiesto e l'URL di origine (non versionato). Segmento "Lusso" del portale: 77 righe,
mappate sulla tipologia OMI «signorile»; è un'etichetta commerciale, non la categoria
catastale A/1.

**Verifica a campione**: 12 righe riaperte a mano da Francesco. Prezzi e metri confermati
in 12 su 12 (2 da copia indicizzata perché l'annuncio era stato tolto); 2 correzioni di
stato applicate (l'«abitabile» del campo sintetico nascondeva un «rinnovato» nella
descrizione). Due casi atipici veri e tenuti: micro-suite da 21 m² a 380.000 €; loft su tre
livelli.

Nessuno di questi annunci porta un prezzo di compravendita. La colonna `prezzo_venduto`
esiste ed è vuota.

## Variabile di confronto

Per ogni annuncio il motore riceve gli stessi dati che riceverebbe da un utente (zona
risolta dall'indirizzo, metri, stato, piano, ascensore, classe, tipologia) e produce
`pubblica`, il **prezzo di pubblicazione stimato** = valore centrale × 1,06. Si confronta
`pubblica` con il **prezzo richiesto** nell'annuncio:

    e = ln(prezzo richiesto / pubblica)

Un `e` di +0,10 significa che il prezzo richiesto supera del 10% circa quello che il motore
avrebbe suggerito di pubblicare. Il logaritmo rende simmetrici sopra e sotto. Quando un
giorno ci saranno prezzi venduti, il confronto sarà con il valore centrale (`centro`), e lo
script lo fa già da solo se la colonna è piena.

## Metriche

- **scarto mediano**: mediana di `e`; dice se il motore è sistematicamente alto o basso;
- **dispersione (MAD)**: mediana degli scostamenti assoluti dalla mediana; dice quanto le
  singole stime si allontanano, senza farsi trascinare dagli estremi;
- **quota entro ±10%**: percentuale di annunci con |e| ≤ ln(1,10).

Tutte per stato conservativo e per fascia OMI, con `npm run calibra`.

## Cosa è stato tarato, e come

Sul 2024/2 (5 settembre, mattina): livello 1,05 in B e C (l'OMI correva sotto i prezzi
richiesti), compressione del premio di stato 0,45 in B/C e 0,70 in D/E, sconto «da
ristrutturare» 0,95. La ricerca è a griglia sui parametri, con la mediana come bersaglio
(zero) e la MAD come controllo; lo script propone, il cambio passa da un commit.

Sul 2025/2 (5 settembre, sera), stessi 201 annunci: con la base nuova la fascia B era
sopra del 3%, quindi livello B da 1,05 a **1,02**; il resto invariato. Risultato:

| Taglio | n | scarto mediano | MAD | entro ±10% |
|---|---|---|---|---|
| Tutti | 201 | −0,3% | 13,6% | 37% |
| Al civico, senza «signorile» | 99 | −0,7% | 10,1% | 45% |
| Solo «signorile» | 48 | +13,9% | 18,9% | 25% |

## Rimisurato il 7 settembre 2026

Gli stessi 201 annunci, con il codice e i dati di oggi e la conversione corretta (classe non nota
come `nd`, nessuna superficie dedotta dal numero di balconi, box contato solo dove documentato):

| Taglio | n | scarto mediano | MAD | entro ±10% | entro ±20% |
|---|---|---|---|---|---|
| Tutti | 201 | **+1,9%** | **13,7%** | **35%** | 63% |
| Senza «signorile» (tipo `civ`) | 124 | +0,7% | 11,6% | 44% | 73% |
| Solo «signorile» | 77 | +10,5% | 18,3% | 21% | 47% |

Riproducibile con `npm run calibra`, blocco «COM'È OGGI». I tagli qui sono per tipologia
catastale, non «al civico»: sono quelli che lo script sa rifare da solo.

**La mediana non è più a zero, e non l'abbiamo riportata a zero.** I coefficienti sono quelli
scelti il 5 settembre; da allora sono cambiate le quotazioni e la conversione dei dati. Ritoccare
il livello per far tornare lo zero significherebbe inseguire il campione su cui il modello è già
tarato: il numero che conta verrà dal campione di verifica indipendente, che non esiste ancora.
La differenza non viene dal box: con il box incluso come prima la mediana è +1,8%.

Le pagine pubbliche (`/metodo` e le fonti del risultato) riportano i numeri di questa sezione,
non più quelli del 5 settembre.

## Il 6%

`COEFF.margineTrattativa = 0.06` è una **convenzione del motore**, non un dato misurato a
parte: la taratura regola il livello in modo che `pubblica` coincida in mediana con i prezzi
richiesti. Livello e 6% non sono identificabili separatamente da questi dati; quello che è
misurato è che, con il 6% e il livello scelto, il prezzo di pubblicazione stimato sta in
mediana sui prezzi richiesti. Per questo la pagina lo chiama «convenzione allineata ai
prezzi richiesti», e non «distanza misurata».

## Campione di taratura e campione di verifica

**Non c'è ancora un campione di verifica indipendente.** I numeri sopra sono calcolati sugli
stessi annunci usati per scegliere i parametri: sono ottimistici per costruzione, anche se
i parametri sono pochi (quattro) e il rischio di adattamento è contenuto. Il protocollo per
ottenerne uno — lotti `-verifica` separati, duplicati tolti anche fra portali, modello
congelato prima di guardare i dati, nessun coefficiente scelto sulla verifica, rapporto con
dimensione, copertura, date e metriche — è in **`docs/verifica.md`**; lo fa rispettare
`npm run verifica`. Un lotto Idealista non è una verifica finché non passa da lì.

## Cosa non dimostrano questi numeri

Che le stime siano vicine ai **prezzi di compravendita**. A Milano la distanza tipica fra
richiesto e venduto è di alcuni punti percentuali e varia con il mercato; il motore la
incorpora come convenzione (il 6%) e non la misura. Per misurarla servono rogiti o dati di
compravendita, che oggi non abbiamo.

## Verifica dello strumento

`scripts/calibra.mjs` è stato provato su un mercato sintetico con parametri noti
(compressione 0,90, livello 1,06): li ha ritrovati a 0,85 e 1,09. L'esperimento sui
comparabili al civico (`npm run comparabili`) è leave-one-out: ogni annuncio è escluso dal
proprio insieme di vicini, insieme ai suoi duplicati.
