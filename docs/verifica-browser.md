# Casi essenziali da ripetere nel browser dopo ogni deploy

Sul dominio pubblico, in Chrome desktop e su uno smartphone. Ogni caso dice cosa deve
comparire; se manca, il deploy non è finito.

1. **Nuovo immobile dopo un altro.** Importa Porro Lambertenghi 25 (seminterrato, box a
   parte), poi «Modifica i dati» → «Cambia» → incolla Farini 81 (55 mq, 265.000) →
   «Importa un nuovo immobile». Devono comparire: abitabile / 1-2 / ascensore ai
   predefiniti, nessun box a parte, e sotto stato, piano, ascensore, pertinenze e box il
   riquadro «Non dichiarato nell'annuncio … Confermo questo valore / Non lo so».
2. **Dati non confermati.** Con Farini 81 appena importato premi «Valuta»: deve comparire il
   blocco «Dati non confermati: stato conservativo, piano, ascensore» e nessun risultato.
   Attiva «Simulazione con dati incompleti» → «Valuta»: titolo «simulazione con dati
   incompleti», elenco delle ipotesi accanto al numero, capitolo «Prezzi e valori dello
   scenario» con «Nessun giudizio», niente offerta. Poi torna, premi «Confermo questo
   valore» sui tre campi e «Valuta»: risultato normale, con giudizio e offerta.
3. **Box a parte senza prezzo.** Porro Lambertenghi 25 con «includilo nella valutazione»:
   «Al metro quadro · abitazione» è il valore della sola abitazione; riga «Di cui
   abitazione … box … con il box dentro sarebbero … €/mq»; confronto: abitazione contro
   abitazione, box «prezzo non indicato», «Totale: confronto non disponibile».
4. **Seminterrato.** Senza simulazione «Valuta» è bloccato con «Il modello attuale non
   dispone di un trattamento validato per questo piano». Con la simulazione: titolo,
   avviso rosso, «Prezzi e valori dello scenario», riga «Scenario, non valutazione» nei
   capitoli lavori e affitto, `/stime` con l'avvertenza.
5. **Vendo con box a 40.000.** Tre righe: abitazione, box, totale, ciascuna con il proprio
   valore.

6. **Intestazione stretta.** A 320 e 390 px di larghezza: marchio (a 320 il solo simbolo),
   «Valuta» e il bottone «Menu». Nessuno scorrimento orizzontale della pagina. «Menu» apre
   Valuta, Quartieri, Le mie stime e Accedi in un pannello sotto la barra; si chiude con Esc,
   toccando fuori e cambiando pagina. Il marchio porta alla home.
7. **Ingresso da chi compra.** In home «Voglio comprare» fa comparire «Incolla il testo
   dell'annuncio»: il link porta a `/valuta` con il campo di testo già a fuoco. «Valuta ora»
   con il campo vuoto scrive «Scrivi via e numero civico…» invece di non fare niente.
8. **Risultato.** Titolo «La valutazione della casa», indirizzo con «Modifica i dati» accanto,
   poi valore, intervallo e limiti. Comprare/vendere sta sotto la riga di separazione, accanto
   all'indice Valore · Lavori · Affitto · Quartiere · Fonti (i link portano alle sezioni).
   L'affitto a notte è chiuso finché non lo si apre. Con il prezzo dentro l'intervallo il testo
   è «Il prezzo richiesto rientra nell'intervallo stimato». In fondo, «Come calcoliamo la
   stima» porta a `/metodo`.
9. **Ristrutturazione a 320 px.** I quattro scenari (Oggi, Essenziale, Completa, Design) sono
   tutti visibili su due righe, senza scorrimento. «Da pagare per i lavori · oggi» e «Recupero
   fiscale · negli anni, non oggi» sono due blocchi distinti. Ogni intervento è una riga con
   nome, stato e costo, che si apre solo se la si tocca; «Già fatto» e «Non lo faccio» restano
   due scelte diverse.
10. **Stime salvate.** Da telefono, «Le mie stime» è nel menu. Ogni scheda ha intento e data,
    valore, intervallo, €/mq e gli avvisi di simulazione. «Apri stima» riapre dati e risultato
    di allora con la nota della data e il comando «Ricalcola con i dati di oggi» (che crea una
    stima nuova, non sostituisce). «Elimina» è secondario e per sette secondi si annulla.
11. **Quartieri.** Il campo di ricerca filtra per nome di zona e per codice OMI (per esempio
    «D10» o «isola»); il conteggio dei risultati si aggiorna.
