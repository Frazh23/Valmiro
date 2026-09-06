# Protocollo di verifica — versione 2

Validazione indipendente non ancora eseguita.

## Correzione dei campioni
I «100 nuovi» sono 70 vendite e 30 affitti; tutte le 70 vendite sono già in taratura. Elenco: `docs/sovrapposizione-campioni.csv`. Non convertirli in verifica. Il vecchio `parametri-congelati.json` è conservato come documento storico: verificava solo parametri e non prova l'identità di codice e dati.

## Prima della raccolta
Completare test e commit con albero pulito, eseguire `npm run verifica -- --congela`, poi committare il congelamento generato in `data/annunci/congelamenti/`. Non cambiare codice/dati né aprire il nuovo campione fra congelamento e raccolta. Il nuovo hash include tutti i file di `src/lib/`, dati (escluso l'archivio annunci), convertitore, importatore e codice di verifica. È volutamente conservativo: anche una modifica innocua può richiedere un nuovo congelamento. Non sostituire il congelamento storico. Lo script non sovrascrive snapshot esistenti.

## Ruoli e origine
I lotti con `-verifica` nel nome oppure `ruolo: verifica` nel manifest non sono caricati dalla taratura o dai comparabili. Passarli direttamente alla taratura genera un errore. I lotti storici senza manifest sono taratura. Ogni nuovo lotto di verifica richiede `.meta.json` con `ruolo`, `modelloHash`, SHA256 del CSV `csvHash`, `raccoltaInizio` ISO successiva al congelamento, `fonte`, `metodoRaccolta`. Una data nel manifest documenta la dichiarazione, non costituisce prova indipendente della cronologia: conservare ricevute/API, fonte e storia git.

`npm run idealista -- --verifica` controlla il congelamento prima della rete e scrive CSV e manifest senza sovrascrivere lotti. Mancano le chiavi API. La ricerca geografica non garantisce 100 righe utilizzabili né le quote per fascia: raccogliere ulteriori lotti autorizzati, senza guardare gli errori per scegliere le case. Obiettivo: almeno 100 vendite misurate, almeno 15 per ciascuna fascia B/C/D/E. Non usare affitti, aste o diritti parziali come vendite ordinarie. Documentare data, URL/riferimento, tipologia e prezzo realmente incluso. Nessuna raccolta automatica dai siti dei portali.

## Pulizia prima delle misure
Duplicati per fonte/riferimento oppure indirizzo normalizzato e scarti entro 3% metri e 2% prezzo. I dubbi (stesso indirizzo e metri o prezzo entro 10%) bloccano le metriche; il controllo umano può risolverli tramite `revisioni` nel manifest: `lotto`, `id`, `conLotto`, `conId`, `esito` (`distinti`/`escludi`), `motivo`, `fonte`, `revisore`, `data`. Conservare questi giudizi: non sceglierli guardando gli errori. Immobili diversi nello stesso palazzo possono essere correlati; la deduplica euristica non garantisce indipendenza.

Il convertitore separa conteggi da metri, tratta la classe sconosciuta come `nd`, non include box senza `box_incluso=si`, elenca predefiniti e rifiuta valori non rappresentabili. I buchi restano nel rapporto e non vengono presentati come dati osservati. Verificare manualmente un campione di qualità prima della misura.

## Rapporti
`npm run verifica` scrive JSON e Markdown con timestamp univoco, senza sovrascrivere rapporti. Tutte le righe grezze sono conteggiate; esclusioni e ipotesi sono riportate. Richiesti e venduti sono misurati separatamente, per fascia, stato e tipo.
Scarto percentuale = (stima − prezzo)/prezzo; errore assoluto mediano = mediana del valore assoluto; quote entro ±10% e ±20% sullo stesso denominatore. Lo scarto logaritmico storico = ln(prezzo/stima) è in unità log, non una percentuale ordinaria; MAD log è la dispersione intorno alla sua mediana. Il rapporto indica anche copertura degli intervalli (richiesti: estremi del valore moltiplicati per il 6% convenzionale; venduti: estremi del valore). Nessuna garanzia statistica discende dal nome dell'intervallo.

Sotto 40 righe un gruppo è indicativo. Per pubblicare metriche generali servono 100 righe e le quote B/C/D/E sopra indicate, oltre alla revisione della qualità. Una misura sui richiesti non dimostra precisione sui rogiti. Non aggiornare automaticamente i messaggi pubblici quando compare un rapporto, soprattutto se sintetico o incompleto. Non ritarare sul lotto di verifica; dopo qualsiasi scelta fatta guardandolo serve un campione nuovo.
