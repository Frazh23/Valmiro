# Il gestionale

`/gestione` mostra i numeri del sito a chi lo tiene: account registrati, stime salvate,
zone più valutate, otto settimane di andamento. Non è linkata da nessuna parte e non
finisce nei motori di ricerca: ci si arriva scrivendo l'indirizzo.

**Per chiunque altro la pagina non esiste.** Chi non è amministratore — compreso chi non è
collegato, e chiunque provi l'indirizzo a caso — riceve un 404, non un «non hai accesso»:
quello direbbe comunque che qui c'è qualcosa. Quindi: prima `/accedi`, poi `/gestione`.

Se sei amministratore e vedi 404, in ordine di probabilità: non sei collegato con quell'account,
la funzione `metriche_gestione` non è ancora installata, oppure la sessione è scaduta.

## Perché non serve nessuna chiave nuova

La pagina non ha un endpoint privilegiato dietro. Chiama una sola funzione del database,
`metriche_gestione()`, con la normale chiave pubblica e la sessione di chi è collegato. È
la funzione a decidere: se chi chiama non è nella tabella `amministratori`, risponde
«non autorizzato» e basta. E restituisce solo conteggi e mediane — mai una riga, mai un
indirizzo, mai un'email.

Questo è di proposito: `SUPABASE_SERVICE_ROLE_KEY` scavalca ogni RLS, quindi anche la
tabella delle stime. Per far vedere dei totali non serve.

## Accendere

1. Nel progetto Supabase, SQL Editor: esegui `db/006_gestione.sql`.
2. Authentication → Users: copia l'uuid del tuo account.
3. SQL Editor:
   ```sql
   insert into amministratori (utente, nota) values ('<il tuo uuid>', 'Francesco');
   ```
4. Entra nel sito con quell'account e apri `/gestione`.

Per togliere l'accesso a qualcuno basta cancellare la sua riga da `amministratori`.
Nessuno può leggere quella tabella dal browser: non ha policy e i permessi sono revocati.

## Cosa c'è dentro, e cosa no

Ci sono i dati che il database ha davvero:

- **Account**: totale, ultimi 30 e 7 giorni, privati e agenzie (da `profili`).
- **Stime salvate nell'account**: totale, ultimi 30 e 7 giorni, compro/vendo, quante
  portano il prezzo dell'annuncio, quanti account le hanno fatte, valore e metri mediani.
- **Zone**: le cinque più valutate.
- **Settimane**: le ultime otto, per vedere la direzione.

Non ci sono, e la pagina lo dice:

- **I visitatori.** Non li contiamo: niente analytics, niente cookie di misura. Per
  contarli ci sono due strade, entrambe con un costo — i contatori nostri di
  `docs/telemetria.md` (serve la chiave privilegiata sul server) oppure Vercel Web
  Analytics (i numeri restano nel pannello Vercel, e sopra una soglia si paga).
- **Le stime senza account**, che restano nel browser di chi le fa. I numeri del
  pannello sono una parte del traffico, non tutto: tenerlo a mente prima di leggerli
  come un tasso di conversione.
- **Vendite e abbonamenti**, che non esistono. Quando esisteranno, questa è la pagina
  dove aggiungerli: si estende `metriche_gestione()` e si aggiunge un blocco.

## Il bottone dentro il sito

Da `007_amministratore.sql` esiste anche `sono_amministratore()`: risponde **solo su chi
la chiama**, true o false, mai un elenco. Serve al sito per far comparire la voce
«Gestione» nella barra in alto e il bottone «Statistiche del sito» nella pagina
dell'account soltanto a chi il pannello puo' aprirlo davvero.

Il controllo vero resta dove stava: e' `metriche_gestione()` a rifiutare, e la pagina a
rispondere 404. Chi forzasse il valore nel proprio browser vedrebbe comparire un bottone
e riceverebbe comunque un 404. La risposta resta in `sessionStorage` per non richiederla
a ogni pagina; se la memoria non c'e', si richiede e basta.

Per installarlo: apri `db/007_amministratore.sql`, incolla nell'editor SQL di Supabase,
Run. Si puo' rieseguire senza rischi.


## Visite con consenso (implementazione settembre 2026)

La sezione «Visite al sito» usa `metriche_traffico(p_dal,p_al)` e mantiene invariato
il rapporto di account/stime. Entrambe le letture controllano l'appartenenza alla
tabella `amministratori`; la lista verificata prima dell'intervento contiene solo
l'account di Francesco. La nuova funzione espone esclusivamente aggregati, mai gli
identificatori delle visite. Logout, cambio identità, ritorno alla scheda e controllo
ogni 60 secondi invalidano i dati mostrati. La revoca remota è verificata alla lettura
successiva (entro 60 secondi nella scheda attiva).

Il codice iniziale coincideva con la produzione Vercel: `277dd88`.
Il lavoro è nel ramo `codex/private-traffic`, separato dalla copia principale.

### Raccolta

`POST /api/visite` accetta soltanto evento UUID, visitatore UUID, sessione UUID,
pagina ammessa, categoria provenienza, formato dispositivo e `consenso:true`.
La richiesta è limitata a 1 KB e all'origine APP_ORIGIN; nessun valore libero, URL
completo, IP, email, account o dato di stima entra nel database analytics.
La provenienza è ridotta nel browser a diretto/non disponibile, Google, Bing,
social o altri siti. Il dispositivo è una categoria indicativa basata sulla larghezza.
Il database mantiene fonte e dispositivo iniziali della sessione e deduplica per UUID
dell'evento. Limiti condivisi: 600 eventi/minuto totali e 30 per visitatore.
Le statistiche restano stime, soggette a bot, blocchi e rifiuti: l'origine non prova
l'identità del mittente. Il rifiuto non invia eventi; la revoca elimina gli identificatori
locali e interrompe la raccolta. Un identificatore non è riutilizzato dopo 90 giorni.
La scelta di consenso/rifiuto scade dopo 180 giorni. Nessun collegamento con l'account.

### Attivazione e spegnimento

1. Applicare `supabase/migrations/20260907140308_private_traffic.sql`.
2. Eseguire `db/traffico-retention.sql` e verificare il job in `cron.job`.
   La pulizia è oraria, con un margine di un'ora per non superare i 90 giorni.
3. Configurare **solo lato server** in Vercel `APP_ORIGIN=https://valmiro.it`,
   `SUPABASE_SERVICE_ROLE_KEY` del progetto corretto e `TRAFFICO_ENABLED=true`.
   La chiave privilegiata non va mai in un nome NEXT_PUBLIC, nel repository o nei log.
   Non attivare questi flag per un'anteprima collegata al database di produzione.
4. Pubblicare il frontend con questi valori; il flag del consenso è passato dal server.
5. Attivare la raccolta nel database soltanto quando il frontend è verificato:
   `update private.traffico_stato set attivo=true,iniziato=coalesce(iniziato,now()) where id;`
6. Fare una visita di prova con consenso e verificarne l'arrivo, mantenendola distinta
   dalle visite storiche (non importate). Verificare subito anche rifiuto e revoca.

Per spegnere immediatamente: `update private.traffico_stato set attivo=false where id;`.
Poi impostare `TRAFFICO_ENABLED=false` e ricostruire. Il job di retention deve rimanere
attivo anche con raccolta spenta. Non azzerare `iniziato`: serve a distinguere lo storico
reale dai giorni in cui non esisteva raccolta.

### Verifiche

`npm run typecheck`, `npm test`, `npm run build`.
Test SQL isolato: `PGLITE_MODULE_PATH=/percorso/pglite node tests/traffico-db.mjs`.
Coprono accessi negati, revoca admin, assenza di dati privati nel rapporto, deduplica,
visitatori distinti tra giorni, fonte di sessione, periodi invalidi e cancellazione.
I test HTTP coprono origine, consenso, dimensioni, guasti e non esposizione del segreto.
La verifica visiva è ancora da completare: il browser dell'assistente ha negato
l'accesso all'anteprima locale perché il controllo della policy non era disponibile.
La raccolta nel database è stata predisposta **spenta**; non va dichiarata operativa
senza verifica dei valori Vercel e della visita di prova.
