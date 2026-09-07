-- Private analytics: collection is separate from accounts and saved estimates.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.traffico_stato (
 id boolean primary key default true check(id), attivo boolean not null default false,
 iniziato timestamptz, minuto timestamptz, ricevuti integer not null default 0
);
insert into private.traffico_stato(id) values(true);
create table private.visite (
 evento uuid primary key, visitatore uuid not null, sessione uuid not null,
 ricevuto timestamptz not null default now(),
 pagina text not null check(pagina in ('/','/valuta','/quartieri','/metodo','/privacy','/termini')),
 fonte text not null check(fonte in ('diretto','google','bing','social','altro')),
 dispositivo text not null check(dispositivo in ('telefono','tablet','computer'))
);
create index visite_tempo on private.visite(ricevuto);
create index visite_sessione on private.visite(sessione,ricevuto);
create index visite_visitatore on private.visite(visitatore,ricevuto);
alter table private.visite enable row level security;
alter table private.traffico_stato enable row level security;
revoke all on private.visite,private.traffico_stato from public,anon,authenticated;

create function private.registra_visita(p_evento uuid,p_visitatore uuid,p_sessione uuid,p_pagina text,p_fonte text,p_dispositivo text)
returns void language plpgsql security definer set search_path='' as $$
declare s private.traffico_stato; prima private.visite;
begin
 select * into s from private.traffico_stato where id for update;
 if not s.attivo then return; end if;
 if p_evento is null or p_visitatore is null or p_sessione is null
  or p_pagina is null or p_pagina not in ('/','/valuta','/quartieri','/metodo','/privacy','/termini')
  or p_fonte is null or p_fonte not in ('diretto','google','bing','social','altro')
  or p_dispositivo is null or p_dispositivo not in ('telefono','tablet','computer') then
  raise exception 'misura non valida' using errcode='22023';
 end if;
 -- Shared across server instances. No IP or browser/account lookup.
 if s.minuto=date_trunc('minute',now()) and s.ricevuti>=600 then return; end if;
 if exists(select 1 from private.visite where evento=p_evento) then return; end if;
 if (select count(*) from private.visite where visitatore=p_visitatore and ricevuto>now()-interval '1 minute')>=30 then return; end if;
 select * into prima from private.visite where sessione=p_sessione order by ricevuto limit 1;
 if found and prima.visitatore<>p_visitatore then raise exception 'sessione non valida' using errcode='22023'; end if;
 insert into private.visite(evento,visitatore,sessione,pagina,fonte,dispositivo)
 values(p_evento,p_visitatore,p_sessione,p_pagina,coalesce(prima.fonte,p_fonte),coalesce(prima.dispositivo,p_dispositivo));
 update private.traffico_stato set minuto=date_trunc('minute',now()),
 ricevuti=case when minuto=date_trunc('minute',now()) then ricevuti+1 else 1 end where id;
end $$;
revoke all on function private.registra_visita(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.registra_visita(uuid,uuid,uuid,text,text,text) to service_role;
create function public.registra_visita(p_evento uuid,p_visitatore uuid,p_sessione uuid,p_pagina text,p_fonte text,p_dispositivo text)
returns void language sql security invoker set search_path='' as $$
 select private.registra_visita(p_evento,p_visitatore,p_sessione,p_pagina,p_fonte,p_dispositivo);
$$;
revoke all on function public.registra_visita(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.registra_visita(uuid,uuid,uuid,text,text,text) to service_role;

create function private.metriche_traffico(p_dal date,p_al date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare oggi date := (now() at time zone 'Europe/Rome')::date; esito jsonb; s private.traffico_stato;
begin
 if auth.uid() is null or not exists(select 1 from public.amministratori where utente=auth.uid()) then
 raise exception 'non autorizzato' using errcode='42501'; end if;
 if p_dal is null or p_al is null or p_dal>p_al or p_al>oggi or p_dal<oggi-89 then raise exception 'periodo non valido' using errcode='22023'; end if;
 select * into s from private.traffico_stato where id;
 with periodo as (
 select *, (ricevuto at time zone 'Europe/Rome')::date giorno from private.visite
 where ricevuto>= (p_dal::timestamp at time zone 'Europe/Rome')
 and ricevuto< ((p_al+1)::timestamp at time zone 'Europe/Rome')
 and ricevuto>now()-interval '90 days'
 ), giorni as (
 select d::date giorno from generate_series(p_dal::timestamp,p_al::timestamp,interval '1 day') d
 )
 select jsonb_build_object(
 'attivo',s.attivo,'iniziato',s.iniziato,'generato',now(),'dal',p_dal,'al',p_al,
 'visitatori',(select count(distinct visitatore) from periodo),
 'sessioni',(select count(distinct sessione) from periodo),
 'pagineViste',(select count(*) from periodo),
 'giorni',(select jsonb_agg(jsonb_build_object('giorno',g.giorno,'visite',(select count(distinct sessione) from periodo p where p.giorno=g.giorno),'pagine',(select count(*) from periodo p where p.giorno=g.giorno)) order by g.giorno) from giorni g),
 'pagine',coalesce((select jsonb_agg(x order by n desc,pagina) from (select pagina,count(*) n from periodo group by pagina) x),'[]'::jsonb),
 'fonti',coalesce((select jsonb_agg(x order by n desc,fonte) from (select fonte,count(distinct sessione) n from periodo group by fonte) x),'[]'::jsonb),
 'dispositivi',coalesce((select jsonb_agg(x order by n desc,dispositivo) from (select dispositivo,count(distinct sessione) n from periodo group by dispositivo) x),'[]'::jsonb)
 ) into esito;
 return esito;
end $$;
revoke all on function private.metriche_traffico(date,date) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.metriche_traffico(date,date) to authenticated;
create function public.metriche_traffico(p_dal date,p_al date)
returns jsonb language sql security invoker set search_path='' as $$
 select private.metriche_traffico(p_dal,p_al);
$$;
revoke all on function public.metriche_traffico(date,date) from public,anon;
grant execute on function public.metriche_traffico(date,date) to authenticated;
commit;
