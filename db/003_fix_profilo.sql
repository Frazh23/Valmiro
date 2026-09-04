-- Correzione: "Database error saving new user" alla registrazione.
-- Da eseguire nell'editor SQL di Supabase. E' idempotente: si puo' rilanciare.
--
-- CAUSA. La funzione del trigger era `security definer` ma senza `set search_path`.
-- Una funzione security definer non eredita il search_path di chi la chiama: gira
-- con quello del proprietario, e quando Supabase la invoca dal trigger su
-- auth.users quel search_path non contiene `public`. Risultato: ne' la tabella
-- `profili` ne' il tipo `tipo_profilo` vengono risolti, la funzione solleva
-- un'eccezione, l'inserimento in auth.users viene annullato insieme a lei, e
-- l'utente riceve il messaggio generico "Database error saving new user".
--
-- Il messaggio e' generico apposta: GoTrue non espone gli errori del database
-- all'esterno, altrimenti sarebbe una via per sondare lo schema. L'errore vero
-- si legge nel pannello Supabase, in Logs -> Postgres.
--
-- RIMEDIO. Fissare il search_path e qualificare esplicitamente ogni nome.

create or replace function public.crea_profilo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profili (id, tipo, nome, ragione_sociale, partita_iva)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'tipo')::public.tipo_profilo, 'privato'),
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'ragione_sociale',
    new.raw_user_meta_data->>'partita_iva'
  )
  -- Se il profilo esiste gia' (riesecuzione, doppio evento) non e' un errore.
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_nuovo_utente on auth.users;
create trigger al_nuovo_utente
  after insert on auth.users
  for each row execute function public.crea_profilo();

-- Verifica: deve restituire una riga.
-- select tgname, tgrelid::regclass from pg_trigger where tgname = 'al_nuovo_utente';
