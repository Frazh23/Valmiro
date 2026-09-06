// Eseguire con PGLITE_MODULE_PATH=/percorso/pglite node tests/telemetria-db.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=createRequire(import.meta.url)(process.env.PGLITE_MODULE_PATH||'@electric-sql/pglite');
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
await db.exec(readFileSync(new URL('../db/005_telemetria.sql',import.meta.url),'utf8'));
for(const role of ['anon','authenticated']) {
 await db.exec(`set role ${role}`);
 await assert.rejects(()=>db.query('select * from public.eventi_giornalieri'),/permission denied/);
 await assert.rejects(()=>db.query("select public.registra_evento('avvio','nd','mobile','percorso','test')"),/permission denied/);
 await db.exec('reset role');
}
await db.exec('set role service_role');
await Promise.all(Array.from({length:12},()=>db.query("select public.registra_evento('avvio','nd','mobile','percorso','test')")));
let rows=(await db.query('select * from public.eventi_giornalieri')).rows;assert.equal(Number(rows[0].conteggio),12);
await assert.rejects(()=>db.query("select public.registra_evento('indirizzo personale','nd','mobile','percorso','test')"),/check constraint/);
await db.exec("insert into public.eventi_giornalieri values(current_date-90,'avvio','nd','desktop','percorso','old',1)");
await db.query("select public.registra_evento('avvio','nd','mobile','percorso','test')");
assert.equal((await db.query('select count(*) as n from public.eventi_giornalieri')).rows[0].n,1);
await db.close();console.log('SQL: ruoli negati, incremento atomico, validazione e retention verificati.');
