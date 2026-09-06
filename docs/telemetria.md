# Telemetria essenziale, disattivata per default

Contatori aggregati, non utenti unici: evento/intento/formato/componente/versione/giorno. Endpoint `POST /api/eventi`: body esatto `{evento,intento,formato}`, massimo 256 byte, origine configurata, eventi ammessi in `telemetria-schema.ts`. Nessun identificativo persistente, cookie analitico, fingerprint, indirizzo, annuncio o email; le richieste non inviano credenziali browser. La diagnostica non accetta stack o messaggi liberi. I log tecnici di hosting sono separati.

Deduplica in memoria per evento e intento durante il percorso; nuova importazione azzera il set. Conteggi dei passaggi, non funnel individuali: non calcolare «utenti che abbandonano» sottraendo questi valori. Gli eventi `lavori_aperti` indicano interazione con la sezione, non sola visualizzazione.

## Attivazione
1. Eseguire `db/005_telemetria.sql` nel progetto Supabase corretto. La migrazione usa RLS, nessun permesso a `anon`/`authenticated`, funzione SECURITY INVOKER riservata a `service_role`. Chiave privilegiata solo sul server.
2. Verificare ruoli, incremento concorrente e retention. Test locale PostgreSQL embedded: `PGLITE_MODULE_PATH=/percorso/pglite node tests/telemetria-db.mjs`. Ripetere nel progetto reale prima di attivare.
3. Abilitare/configurare il job giornaliero di pulizia indicato nella migrazione. Nessuna attivazione finché non è presente e verificato; l'eliminazione anche in scrittura non basta quando non arriva traffico.
4. Verificare quote e risorse dell'account esistente e configurare APP_ORIGIN e SUPABASE_SERVICE_ROLE_KEY sul server. Non impostare chiavi con prefisso pubblico.
5. Aggiornare dati del gestore e verificare informativa/privacy e impostazioni dei fornitori. Solo allora impostare TELEMETRIA_ENABLED=true e NEXT_PUBLIC_TELEMETRIA_ENABLED=true e ricostruire/deployare insieme. Nessun abbonamento attivato da questo intervento.

Timeout 1,5 secondi, errore ignorato dal percorso. Limite 120 richieste/minuto per istanza, contatori saturati a 10.000 per aggregato/giorno. Non è una difesa distribuita contro attacchi: configurare anche le protezioni di hosting prima dell'apertura su larga scala. Statistiche soggette a bot e mancati invii; l'origine HTTP non autentica un visitatore.

Rapporto amministrativo: con variabili server locali `node scripts/rapporto-eventi.mjs`. Lettura privata, ultimi 1.000 aggregati; nessuna dashboard pubblica. Per spegnere: flag server false (arresta le scritture), poi ricostruire con flag client false. I contatori esistenti seguono la retention.

Riferimenti consultati: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/database/functions ; https://www.garanteprivacy.it/faq/cookie . La minimizzazione non è una certificazione di conformità; verificare configurazione e trattamento effettivi.
