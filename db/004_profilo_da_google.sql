-- Chi entra con Google non passa dal nostro modulo: nei metadati dell'utente
-- non c'e' "nome" ma "full_name" (o "name"). Senza questo, il profilo di chi
-- arriva da Google nasce senza nome e la pagina lo saluta con l'email.
-- Il tipo resta "privato": l'agenzia si dichiara nel modulo, non su Google.
--
-- Da eseguire nel SQL editor di Supabase, una volta.

create or replace function public.crea_profilo()
returns trigger language plpgsql security definer
set search_path = public
as $$ begin
  insert into public.profili (id, tipo, nome, ragione_sociale, partita_iva)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'tipo')::public.tipo_profilo, 'privato'),
    coalesce(
      nullif(new.raw_user_meta_data->>'nome', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', '')
    ),
    new.raw_user_meta_data->>'ragione_sociale',
    new.raw_user_meta_data->>'partita_iva'
  )
  on conflict (id) do nothing;
  return new;
end $$;
