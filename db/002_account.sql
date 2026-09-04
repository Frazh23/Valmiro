-- Account e profili. Da eseguire nell'editor SQL di Supabase dopo 001_schema.sql.
-- Supabase tiene gli utenti in auth.users: qui aggiungiamo solo cio' che ci serve.

create type tipo_profilo as enum ('privato', 'agenzia');

create table if not exists profili (
  id            uuid primary key references auth.users on delete cascade,
  tipo          tipo_profilo not null default 'privato',
  nome          text,
  -- compilati solo dalle agenzie
  ragione_sociale text,
  partita_iva     text,
  telefono        text,
  citta           text,
  creato_il     timestamptz not null default now(),
  constraint agenzia_ha_ragione_sociale
    check (tipo = 'privato' or (ragione_sociale is not null and length(ragione_sociale) > 1))
);

-- Ogni utente vede e modifica solo il proprio profilo.
alter table profili enable row level security;
create policy "profilo proprio in lettura"  on profili for select using (auth.uid() = id);
create policy "profilo proprio in scrittura" on profili for update using (auth.uid() = id);
create policy "profilo proprio in creazione" on profili for insert with check (auth.uid() = id);

-- Alla registrazione crea il profilo, leggendo tipo e dati dai metadati dell'utente.
create or replace function crea_profilo()
returns trigger language plpgsql security definer as $$
begin
  insert into profili (id, tipo, nome, ragione_sociale, partita_iva)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'tipo')::tipo_profilo, 'privato'),
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'ragione_sociale',
    new.raw_user_meta_data->>'partita_iva'
  );
  return new;
end $$;

drop trigger if exists al_nuovo_utente on auth.users;
create trigger al_nuovo_utente after insert on auth.users
  for each row execute function crea_profilo();

-- Le stime diventano di qualcuno. Restano leggibili solo dal loro proprietario:
-- un indirizzo di casa e' un dato personale, non un log.
alter table stime add column if not exists utente uuid references auth.users on delete cascade;
create index if not exists stime_utente_idx on stime (utente, creata_il desc);

alter table stime enable row level security;
create policy "stime proprie in lettura"   on stime for select using (auth.uid() = utente);
create policy "stime proprie in creazione" on stime for insert with check (auth.uid() = utente);
create policy "stime proprie in modifica"  on stime for delete using (auth.uid() = utente);
