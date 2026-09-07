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
