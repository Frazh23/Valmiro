-- Disattivata nell'app finché migrazione, permessi e conservazione non sono verificati.
begin;
create table public.eventi_giornalieri (
 giorno date not null default current_date,
 evento text not null check(evento in ('avvio','indirizzo_ok','indirizzo_ko','import_ok','import_ko','passo_intento','passo_dove','passo_casa','passo_risultato','calcolo_ok','calcolo_ko','lavori_aperti','salvataggio_ok','salvataggio_ko','errore_ui')),
 intento text not null check(intento in ('compro','vendo','nd')),
 formato text not null check(formato in ('mobile','desktop')),
 componente text not null check(componente in ('storage','estimate','ui','percorso')),
 versione varchar(40) not null,
 conteggio bigint not null check(conteggio between 1 and 10000),
 primary key(giorno,evento,intento,formato,componente,versione)
);
alter table public.eventi_giornalieri enable row level security;
revoke all on public.eventi_giornalieri from public, anon, authenticated;
grant select,insert,update,delete on public.eventi_giornalieri to service_role;
create function public.registra_evento(p_evento text,p_intento text,p_formato text,p_componente text,p_versione text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 delete from public.eventi_giornalieri where giorno < current_date-89;
 insert into public.eventi_giornalieri(giorno,evento,intento,formato,componente,versione,conteggio)
 values(current_date,p_evento,p_intento,p_formato,p_componente,p_versione,1)
 on conflict(giorno,evento,intento,formato,componente,versione)
 do update set conteggio=least(public.eventi_giornalieri.conteggio+1,10000);
end;
$$;
revoke all on function public.registra_evento(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.registra_evento(text,text,text,text,text) to service_role;
commit;
-- Prima di attivare la telemetria, configurare questo job quotidiano in pg_cron
-- (estensione da abilitare nel progetto se disponibile):
-- select cron.schedule('valmiro-retention-eventi','10 2 * * *',
-- $$delete from public.eventi_giornalieri where giorno < current_date-89$$);
