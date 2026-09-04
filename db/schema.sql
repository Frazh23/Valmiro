-- Schema Postgres + PostGIS.
-- L'app funziona anche senza database, leggendo i file in data/: questo serve quando
-- vuoi query spaziali vere, storico dei semestri e salvataggio delle stime.

create extension if not exists postgis;

-- Geometrie delle zone. Una riga per zona e semestre: le zone cambiano di rado,
-- ma quando cambiano vuoi poter ricostruire com'erano.
create table if not exists omi_zone (
  zona        text not null,
  semestre    text not null,          -- es. '2024-2'
  descrizione text not null,
  fascia      char(1) not null,
  geom        geometry(MultiPolygon, 4326) not null,
  primary key (zona, semestre)
);
create index if not exists omi_zone_geom_idx on omi_zone using gist (geom);

-- Quotazioni. MAI aggiornare una riga: si aggiunge il semestre nuovo e si lasciano
-- i vecchi al loro posto. Costa qualche megabyte e ti da' storico, ricostruzione
-- delle stime passate e rollback se una pubblicazione esce sporca.
create table if not exists omi_quotazioni (
  zona       text not null,
  semestre   text not null,
  tipologia  text not null,           -- civ | sig | eco | vil | box
  stato      text not null,           -- NORMALE | OTTIMO
  eur_mq_min numeric not null check (eur_mq_min > 0),
  eur_mq_max numeric not null,
  primary key (zona, semestre, tipologia, stato),
  check (eur_mq_max >= eur_mq_min)
);

-- Registro degli ingest: quando, da dove, quante righe, esito.
create table if not exists ingest_log (
  id          bigserial primary key,
  fonte       text not null,
  semestre    text,
  risorsa_url text,
  righe       integer,
  esito       text not null,
  eseguito_il timestamptz not null default now()
);

-- Ogni stima richiesta e' un comparabile che ti sei procurato da solo.
-- E' il dataset proprietario: va popolato dal primo utente, non dal centesimo.
create table if not exists stime (
  id            bigserial primary key,
  creata_il     timestamptz not null default now(),
  indirizzo     text,
  punto         geometry(Point, 4326),
  zona          text,
  semestre_base text,
  input         jsonb not null,
  risultato     jsonb not null,
  prezzo_esposto numeric,             -- dichiarato dall'utente: il comparabile vero
  esito         text                  -- da riempire dopo: venduto_a, ritirato, ...
);
create index if not exists stime_punto_idx on stime using gist (punto);
create index if not exists stime_zona_idx on stime (zona, creata_il desc);

-- Vista del semestre corrente: l'app legge da qui e non deve sapere quale sia.
create or replace view omi_corrente as
select q.*, z.descrizione, z.fascia, z.geom
from omi_quotazioni q
join omi_zone z using (zona, semestre)
where q.semestre = (select max(semestre) from omi_quotazioni);

-- La query che conta: da un punto alla sua zona e alle sue quotazioni.
-- select * from omi_corrente where ST_Contains(geom, ST_SetSRID(ST_Point(9.19, 45.4642), 4326));
