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
