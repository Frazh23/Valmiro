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
