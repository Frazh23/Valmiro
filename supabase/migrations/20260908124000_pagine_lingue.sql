-- Due pagine nuove fra quelle misurate: /en e /fr.
--
-- L'elenco delle pagine ammesse vive in tre posti che devono restare uguali:
-- il vincolo della tabella, il controllo dentro registra_visita e PAGINE in
-- src/lib/traffico.ts. Se uno resta indietro, gli eventi di quella pagina
-- vengono rifiutati e non se ne accorge nessuno: il browser ignora l'errore.
begin;

alter table private.visite drop constraint visite_pagina_check;
alter table private.visite add constraint visite_pagina_check
 check (pagina in ('/','/valuta','/quartieri','/metodo','/privacy','/termini','/en','/fr'));

create or replace function private.registra_visita(p_evento uuid,p_visitatore uuid,p_sessione uuid,p_pagina text,p_fonte text,p_dispositivo text)
returns void language plpgsql security definer set search_path='' as $$
declare s private.traffico_stato; prima private.visite;
begin
 select * into s from private.traffico_stato where id for update;
 if not s.attivo then return; end if;
 if p_evento is null or p_visitatore is null or p_sessione is null
  or p_pagina is null or p_pagina not in ('/','/valuta','/quartieri','/metodo','/privacy','/termini','/en','/fr')
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
grant execute on function private.registra_visita(uuid,uuid,uuid,text,text,text) to service_role;

commit;
