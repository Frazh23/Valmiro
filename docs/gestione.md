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

- **I visitatori che non hanno acconsentito.** Chi rifiuta, o non sceglie, non viene
  misurato: la sezione «Visite al sito» descrive il traffico consentito, non tutte le
  persone che arrivano. Come funziona la raccolta è più sotto.
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

In produzione da `9c3c73a` (8 settembre 2026). La raccolta nel database è **attiva**
dalle 12:33:42 del giorno stesso; nessuno storico è stato importato, e il primo giorno
misurato è quello.

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

Prima di ogni consegna: `npm run typecheck`, `npm test`, `npm run build`.
Test SQL isolato: `PGLITE_MODULE_PATH=/percorso/pglite node tests/traffico-db.mjs`.
Copre accessi negati, revoca dell'amministratore, assenza di dati privati nel rapporto,
deduplica, visitatori distinti tra giorni, fonte di sessione, periodi invalidi e
cancellazione. I test HTTP coprono origine, consenso, dimensioni, guasti e non
esposizione del segreto.

#### Provato sul sito pubblicato, 8 settembre 2026

Con una visita vera dal browser, partendo da database vuoto (0 eventi nel giorno):

- **Prima della scelta**: nessun evento. **Dopo il rifiuto**: tre pagine pubbliche
  visitate, ancora nessun evento e nessun identificatore nella memoria del browser.
- **Dopo l'accettazione**: cinque pagine pubbliche → esattamente 5 pagine viste,
  1 sessione, 1 visitatore. `/stime`, `/accedi` e `/gestione` non hanno prodotto nulla.
- **Trenta minuti di inattività** (simulati spostando indietro l'ultimo accesso):
  nuova sessione, stesso visitatore. **Novanta giorni** (simulati scadendo
  l'identificatore): visitatore nuovo, mai riutilizzato, nuova scadenza a 90 giorni.
- **Revoca**: identificatori cancellati, e due altre pagine pubbliche non hanno
  aggiunto niente. In tutto 7 pagine viste, 3 sessioni, 2 visitatori: gli stessi
  numeri che il pannello mostra.
- **Filtri**: Oggi, 7 e 30 giorni corretti; intervallo 1–7 settembre → 0 e il messaggio
  «Nessuna visita rilevata», che è anche la prova del confine di giornata italiano
  (gli eventi delle 12:45 dell'8 restano fuori).
- **Endpoint**: tipo di contenuto sbagliato o assente 415; JSON rotto, campo in più,
  consenso mancante o falso, pagina non ammessa, pagina con parametri, uuid finto,
  fonte inventata 400; corpo oltre 1 KB 413. Nessuna di queste richieste ha scritto.
  Una richiesta da un'altra origine non ha scritto nulla.
- **Permessi**: da anonimo, `metriche_traffico`, `metriche_gestione` e `registra_visita`
  rispondono 42501. `registra_visita` è negata **anche all'amministratore**: solo il
  ruolo di servizio può scrivere. Periodo invertito, oltre 90 giorni o nel futuro: 22023.

Non verificati sul sito pubblicato, e perché: il rifiuto a un **account ordinario**
(servirebbe un secondo account, e non ne creo per conto di altri), l'azzeramento allo
**scollegamento** e la **revoca dei privilegi** (toccano l'unico amministratore di
produzione), l'**esecuzione effettiva del job** di cancellazione e i **limiti di frequenza**
(600 al minuto in tutto, 30 per visitatore: provarli dal vivo significherebbe scrivere
trenta visite finte nei conteggi veri). Restano coperti dal test SQL isolato, che qui non
è stato rieseguito perché pglite non è installabile in questo ambiente.

### Due correzioni dopo la verifica dell'8 settembre

**Il pannello si riazzerava da solo.** Il ricontrollo dei permessi — ogni 60 secondi e a
ogni ritorno sulla scheda — svuotava i dati della pagina prima di richiederli. Svuotarli
smontava il componente delle visite, che ripartiva dal periodo predefinito: bastava
scegliere un intervallo e aspettare un minuto per vederlo tornare a «7 giorni». Ora il
ricontrollo c'è ancora e ha la stessa forza (se il permesso è stato revocato, la risposta
successiva porta al 404), ma non svuota niente: i numeri restano finché non arrivano
quelli nuovi. L'azzeramento immediato resta dov'è utile, cioè al cambio di identità.

**Le date sotto le barre si toccavano.** Con trenta giorni su uno schermo da 320 o 390 px
ogni barra è larga 6–9 px e le etichette diventavano una fila di cifre attaccate. Sotto i
600 px, e solo quando i giorni sono più di dieci, ne resta una ogni cinque più l'ultima:
a 320 px si passa da zero spazio a 29 px fra un'etichetta e l'altra.
