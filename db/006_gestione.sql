-- Gestionale: numeri aggregati per chi tiene il sito, senza chiavi privilegiate.
--
-- Il pannello /gestione legge da qui con la normale chiave pubblica, come utente
-- collegato: e' questa funzione a decidere se rispondere. Nessun SUPABASE_SERVICE_ROLE_KEY,
-- nessun endpoint che scavalca le RLS. La funzione restituisce solo conteggi e mediane:
-- mai una riga, mai un indirizzo, mai un'email.
begin;

-- Chi puo' vedere il gestionale. Si aggiunge a mano dal pannello Supabase:
--   insert into amministratori (utente, nota) values ('<uuid dell utente>', 'Francesco');
-- L'uuid si trova in Authentication -> Users. Nessuno puo' leggere questa tabella
-- dal browser: non ha policy, e i permessi sono revocati.
create table if not exists public.amministratori (
  utente      uuid primary key references auth.users on delete cascade,
  aggiunto_il timestamptz not null default now(),
  nota        text
);
alter table public.amministratori enable row level security;
revoke all on public.amministratori from public, anon, authenticated;

create or replace function public.metriche_gestione()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare esito jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.amministratori where utente = auth.uid()
  ) then
    raise exception 'non autorizzato' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generato', now(),

    'account', (
      select jsonb_build_object(
        'totale',   count(*),
        'ultimi30', count(*) filter (where creato_il > now() - interval '30 days'),
        'ultimi7',  count(*) filter (where creato_il > now() - interval '7 days'),
        'agenzie',  count(*) filter (where tipo = 'agenzia'),
        'privati',  count(*) filter (where tipo = 'privato')
      ) from public.profili
    ),

    'stime', (
      select jsonb_build_object(
        'totale',        count(*),
        'ultimi30',      count(*) filter (where creata_il > now() - interval '30 days'),
        'ultimi7',       count(*) filter (where creata_il > now() - interval '7 days'),
        'compro',        count(*) filter (where input->>'intento' = 'compro'),
        'vendo',         count(*) filter (where input->>'intento' = 'vendo'),
        'conPrezzo',     count(*) filter (where prezzo_esposto is not null),
        'conAccount',    count(distinct utente),
        'valoreMediano', percentile_cont(0.5) within group (order by (risultato->>'centro')::numeric),
        'mqMediani',     percentile_cont(0.5) within group (order by (input->>'mq')::numeric)
      ) from public.stime
    ),

    -- le cinque zone piu' valutate, per sapere dove sta davvero il traffico
    'zone', coalesce((
      select jsonb_agg(riga) from (
        select jsonb_build_object('zona', zona, 'n', count(*)) as riga
        from public.stime where zona is not null
        group by zona order by count(*) desc, zona limit 5
      ) t
    ), '[]'::jsonb),

    -- otto settimane di stime salvate: serve la direzione, non il decimale.
    -- Il raggruppamento e la colonna devono essere la *stessa* espressione: se una
    -- delle due porta un cast in piu' ( ::date ), Postgres non le riconosce uguali
    -- e rifiuta la query con 42803. Qui si raggruppa una volta sola, in una CTE.
    'settimane', coalesce((
      select jsonb_agg(jsonb_build_object('dal', to_char(inizio, 'YYYY-MM-DD'), 'n', quante)
                       order by inizio)
      from (
        select date_trunc('week', creata_il) as inizio, count(*) as quante
        from public.stime
        where creata_il > date_trunc('week', now()) - interval '7 weeks'
        group by date_trunc('week', creata_il)
      ) s
    ), '[]'::jsonb)
  ) into esito;

  return esito;
end $$;

revoke all on function public.metriche_gestione() from public, anon;
grant execute on function public.metriche_gestione() to authenticated;

commit;
