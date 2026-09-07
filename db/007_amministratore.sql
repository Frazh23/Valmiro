-- «Sono io un amministratore?» — la domanda che serve al sito per mostrare un bottone.
--
-- La tabella `amministratori` non e' leggibile dal browser (permessi revocati), ed e'
-- giusto cosi': nessuno deve poter scaricare l'elenco di chi tiene il sito. Ma il
-- pannello ha bisogno di un modo per apparire solo a chi puo' aprirlo, senza far
-- comparire a tutti un bottone che poi risponde 404.
--
-- Questa funzione risponde su *chi la chiama e basta*: true o false, mai un elenco,
-- mai un altro utente. Chi non e' collegato riceve sempre false.
begin;

create or replace function public.sono_amministratore()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select auth.uid() is not null
     and exists (select 1 from public.amministratori where utente = auth.uid());
$$;

revoke all on function public.sono_amministratore() from public, anon;
grant execute on function public.sono_amministratore() to authenticated;

commit;
