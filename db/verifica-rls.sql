-- Chi puo' leggere che cosa, nello schema public. Da incollare nel SQL Editor di
-- Supabase quando si vuole la verita' dal database vero invece che dai file di
-- migrazione. Legge e basta, non cambia niente.
--
-- Come si legge: `anon_puo_leggere = true` con `rls_accesa = false` e' il caso
-- grave — chiunque abbia l'indirizzo del progetto legge quella tabella. Con la
-- RLS accesa e zero regole la tabella e' chiusa a tutti tranne al server.

select c.relname                                as oggetto,
       case c.relkind when 'v' then 'vista'
                      when 'm' then 'vista materializzata'
                      when 'p' then 'tabella partizionata'
                      else 'tabella' end        as tipo,
       c.relrowsecurity                         as rls_accesa,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as regole,
       has_table_privilege('anon', c.oid, 'select')          as anon_legge,
       has_table_privilege('anon', c.oid, 'insert')          as anon_scrive,
       has_table_privilege('authenticated', c.oid, 'select') as utente_legge
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
order by (has_table_privilege('anon', c.oid, 'select') and not c.relrowsecurity) desc,
         c.relname;
