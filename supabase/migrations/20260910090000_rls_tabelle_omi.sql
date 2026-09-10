-- Le tabelle del vecchio schema PostGIS erano aperte a chiunque.
--
-- Supabase l'ha segnalato il 6 settembre 2026 (`rls_disabled_in_public`, «Table
-- publicly accessible»). La causa e' `db/schema.sql`, il file piu' vecchio del
-- progetto: crea omi_zone, omi_quotazioni, ingest_log e stime senza dire niente
-- sui permessi. Su Supabase «niente» non vuol dire chiuso — vuol dire che la
-- tabella e' raggiungibile dall'API pubblica con la chiave che sta nel browser.
-- `stime` era gia' stata chiusa da 002_account.sql; le altre tre no.
--
-- Nessuna parte del sito le legge: l'app lavora sui file JSON in `data/`, e le
-- tre tabelle sono scritte solo da `scripts/load-postgis.mjs`, che si collega
-- direttamente al database come proprietario e quindi non passa da queste
-- regole. Percio' qui non si scrivono policy: si chiude e basta.
--
-- Va chiusa anche la vista `omi_corrente`: una vista gira con i diritti di chi
-- la possiede, quindi lasciarla aperta terrebbe leggibili le tabelle anche dopo
-- aver acceso la RLS sotto. Da Postgres 15 si puo' chiedere il contrario
-- (`security_invoker`), e lo si fa dove il server lo permette.
--
-- Idempotente e prudente: se una tabella nel database vero non esiste, la salta
-- invece di fermarsi.

do $$
declare t text;
begin
  foreach t in array array['public.omi_zone', 'public.omi_quotazioni', 'public.ingest_log'] loop
    if to_regclass(t) is not null then
      execute format('alter table %s enable row level security', t);
      execute format('revoke all on %s from public, anon, authenticated', t);
      raise notice 'chiusa: %', t;
    else
      raise notice 'assente, saltata: %', t;
    end if;
  end loop;

  if to_regclass('public.omi_corrente') is not null then
    execute 'revoke all on public.omi_corrente from public, anon, authenticated';
    begin
      execute 'alter view public.omi_corrente set (security_invoker = on)';
      raise notice 'chiusa: public.omi_corrente (security_invoker)';
    exception when others then
      raise notice 'public.omi_corrente: permessi revocati, security_invoker non supportato';
    end;
  else
    raise notice 'assente, saltata: public.omi_corrente';
  end if;
end $$;

-- ESEGUITA il 10 settembre 2026 sul progetto vero, dal SQL Editor: «Success».
-- Gli errori del Security Advisor sono passati da 5 a 1. Verifica con
-- `db/verifica-rls.sql`: omi_zone, omi_quotazioni, ingest_log hanno RLS accesa e
-- anon non legge piu' niente; omi_corrente idem. `profili` e `stime` risultano
-- leggibili da anon ed e' giusto cosi': il permesso c'e', ma le policy per
-- utente non restituiscono nessuna riga a chi non ha fatto l'accesso.
--
-- Quello che resta, e perche' non si tocca:
--
-- `public.spatial_ref_sys` (l'unico errore rimasto) e le viste
-- `geometry_columns` / `geography_columns` appartengono all'estensione PostGIS,
-- non a noi: `alter table ... enable row level security` risponde
-- «42501: must be owner of table spatial_ref_sys», e la revoca dei permessi
-- passa senza effetto per lo stesso motivo. Dentro ci sono le definizioni
-- pubbliche dei sistemi di coordinate (EPSG) e i nomi delle colonne
-- geometriche: nessun dato di nessuno. Stessa radice per gli avvisi su
-- `st_estimatedextent` e «Extension in Public».
--
-- La soluzione vera sarebbe togliere PostGIS dallo schema public, ma PostGIS
-- non e' rilocabile (`alter extension ... set schema` fallisce) e disinstallarlo
-- vorrebbe dire eliminare le colonne `omi_zone.geom` e `stime.punto` — cioe'
-- cancellare le coordinate delle stime gia' salvate. Non si fa per silenziare
-- un avviso. Da riconsiderare solo se un giorno si decide che PostGIS qui non
-- serve davvero (oggi l'app non lo usa: legge i file in data/).
--
-- `crea_profilo()` risulta «eseguibile senza accesso». E' la funzione trigger
-- che crea il profilo quando nasce un utente: PostgREST non espone le funzioni
-- che ritornano `trigger`, quindi non e' raggiungibile dall'API. Revocare
-- l'EXECUTE sarebbe innocuo in teoria (il permesso si controlla quando il
-- trigger viene creato, non a ogni riga), ma tocca la registrazione degli
-- utenti e non ho modo di provarla senza creare un account vero: lasciata
-- com'e', consapevolmente.
--
-- `metriche_gestione()` e `sono_amministratore()` sono segnalate perche' un
-- utente autenticato puo' chiamarle. E' voluto: sono `security definer` proprio
-- per rispondere «no» a chi non e' amministratore senza esporre la tabella.
