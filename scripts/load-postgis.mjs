#!/usr/bin/env node
/* Carica data/ dentro Postgres+PostGIS. Richiede DATABASE_URL e il pacchetto pg.
   Uso: npm i pg && node scripts/load-postgis.mjs                                  */
import { readFile } from "node:fs/promises";

const SEMESTRE = "2024-2";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL mancante: vedi .env.example"); process.exit(1); }

let pg;
try { pg = await import("pg"); }
catch { console.error("Manca il pacchetto pg. Installa con: npm i pg"); process.exit(1); }

const geo = JSON.parse(await readFile(new URL("../data/zone-omi.json", import.meta.url), "utf8"));
const quot = JSON.parse(await readFile(new URL("../data/quotazioni-omi-2024-2.json", import.meta.url), "utf8"));
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

const c = new pg.default.Client({ connectionString: url });
await c.connect();
await c.query(schema);

let nz = 0;
for (const f of geo.features) {
  const z = f.properties.Zona;
  const g = f.geometry.type === "Polygon"
    ? { type: "MultiPolygon", coordinates: [f.geometry.coordinates] }
    : f.geometry;
  await c.query(
    `insert into omi_zone (zona, semestre, descrizione, fascia, geom)
     values ($1,$2,$3,$4, ST_Multi(ST_GeomFromGeoJSON($5)))
     on conflict (zona, semestre) do update set geom = excluded.geom`,
    [z, SEMESTRE, quot[z]?.d || f.properties.Zona_Descr, f.properties.Fascia, JSON.stringify(g)]
  );
  nz++;
}

let nq = 0;
for (const [z, o] of Object.entries(quot)) {
  for (const tip of ["civ", "sig", "eco", "vil"])
    for (const [stato, v] of Object.entries(o[tip] || {})) {
      await c.query(
        `insert into omi_quotazioni values ($1,$2,$3,$4,$5,$6)
         on conflict do nothing`, [z, SEMESTRE, tip, stato, v[0], v[1]]);
      nq++;
    }
  if (o.box) { await c.query(`insert into omi_quotazioni values ($1,$2,'box','NORMALE',$3,$4) on conflict do nothing`,
    [z, SEMESTRE, o.box[0], o.box[1]]); nq++; }
}
await c.query(`insert into ingest_log (fonte, semestre, righe, esito) values ('caricamento locale', $1, $2, 'ok')`,
  [SEMESTRE, nz + nq]);
console.log(`caricate ${nz} zone e ${nq} quotazioni`);
await c.end();
