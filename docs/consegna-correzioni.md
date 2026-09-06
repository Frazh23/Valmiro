# Consegna tecnica — 7 settembre 2026

Implementazione preparata in copia separata, preservando gli aggiornamenti concorrenti di Claude alle foto, alle sfumature e al motto della home. Nessun deploy o push eseguito.

## Implementato
- Corretta la documentazione del lotto «100 nuovi»: 70 vendite già in taratura e 30 affitti. Elenco delle 70 corrispondenze in docs/sovrapposizione-campioni.csv. Originali immutati.
- Caricamento separato per ruolo, blocco della taratura su file di verifica, CSV quotati, conversione esplicita di classe/pertinenze/box e segnalazione dati mancanti.
- Congelamento completo v2 con hash di codice, convertitore, importatore e dati; il vecchio snapshot rimane storico. Manifest e cronologia obbligatori, dubbi prima delle metriche, revisione tracciata, rapporti separati richiesti/venduti, soglie percentuali corrette e copertura.
- Provenienza informativa v2: nessun bottone di conferma; nota breve accanto al valore e dettaglio espandibile. Modifiche manuali aggiornano la provenienza; nuovo immobile azzera; aggiornamento conserva campi non citati. Vecchie simulazioni mantengono la semantica originaria. Origine non registrata per vecchie stime. Nessun coefficiente o dato OMI modificato.
- Telemetria aggregata con endpoint chiuso, niente dati personali del modulo, chiave privilegiata solo server, contatori atomici e permessi negati ai client. Disattivata per default. Documentazione di attivazione e retention.
- Sottotitolo della home, metodo e privacy allineati. Termini implementati ma disattivati in mancanza dei dati reali del gestore. Protocollo interviste a cinque privati e cinque agenzie, senza contatti inviati.

## Verifiche
72 test automatici superati; TypeScript e build di produzione passati. Test SQL su PostgreSQL embedded: ruoli anon/authenticated negati, incremento concorrente, valori non ammessi e retention. E2E sintetico isolato del congelamento e rapporto, con rifiuto dopo alterazione del motore; NON è validazione immobiliare e non è stato copiato nei rapporti reali.
Browser locale con Chrome: compro/vendo su Farini 81 a 55 mq = 290.000 in entrambi; senza ascensore 281.000; ipotesi aggiornate, salvataggio e riapertura, vecchia stima priva di provenienza, home/risultato a 1440/768/390/320 senza overflow, Menu con evento touch. Nessun errore JavaScript nella prova. API telemetria locale: disabilitata 204, attiva senza DB degrada senza bloccare, rifiuta campi extra/origine/dimensioni/rate eccessivi. Termini non configurati = 404.

## Non eseguito / dipendenze
Nessun controllo del deploy pubblico. Nessuna migrazione nel Supabase reale né nuovo servizio attivato. Mancano IDEALISTA_KEY/SECRET e la chiave amministrativa/database per l'attivazione. Il nuovo campione reale non è stato raccolto. Mancano identità e indirizzo del gestore per pubblicare i termini. Il congelamento reale v2 va eseguito DOPO il commit delle modifiche, con albero pulito, e committato PRIMA della raccolta: non simulare retroattivamente questa cronologia.

Prima del deploy seguire docs/telemetria.md e docs/termini-pubblicazione.md. Nessun numero fuori campione da pubblicare finché manca la raccolta indipendente.
