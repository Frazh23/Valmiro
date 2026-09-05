import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* Verita' sui dati di locazione e sullo storico: le stesse invarianti che
   affitto.ts da' per scontate. Se un ingest le rompe, si sa qui. */

const SEM = "2025-2";
const ZONE = JSON.parse(readFileSync(new URL(`../data/quotazioni-omi-${SEM}.json`, import.meta.url)));
const LOC = JSON.parse(readFileSync(new URL(`../data/locazioni-omi-${SEM}.json`, import.meta.url)));
const STORICO = JSON.parse(readFileSync(new URL("../data/omi-storico.json", import.meta.url)));

test("ogni zona quotata ha i canoni delle abitazioni civili", () => {
  for (const z of Object.keys(ZONE)) {
    assert.ok(LOC[z], `zona ${z} senza canoni`);
    assert.ok(LOC[z].civ.NORMALE || LOC[z].civ.OTTIMO, `zona ${z} senza canoni civili`);
  }
});

test("i canoni sono in euro/mq/mese plausibili e ordinati", () => {
  for (const [z, o] of Object.entries(LOC))
    for (const t of ["civ", "sig", "eco", "vil"])
      for (const [stato, v] of Object.entries(o[t] || {})) {
        assert.ok(v[0] >= 4 && v[1] <= 80 && v[1] >= v[0], `${z}/${t}/${stato} canone incoerente: ${v}`);
      }
});

test("il rendimento lordo di zona sta fra il 2% e l'8% ovunque", () => {
  for (const z of Object.keys(ZONE)) {
    const c = ZONE[z].civ.NORMALE || ZONE[z].civ.OTTIMO;
    const l = LOC[z].civ.NORMALE || LOC[z].civ.OTTIMO;
    const r = ((l[0] + l[1]) / 2 * 12) / ((c[0] + c[1]) / 2);
    assert.ok(r > 0.02 && r < 0.08, `zona ${z}: rendimento ${(r * 100).toFixed(1)}%`);
  }
});

test("lo storico copre tutte le zone, dal 2° semestre 2014 salvo le quattro nate nel 2024, senza buchi", () => {
  const nuove = [];
  for (const z of Object.keys(ZONE)) {
    const s = STORICO.zone[z];
    assert.ok(s && s.serie.length, `zona ${z} senza storico`);
    if (s.dal !== "2014-2") nuove.push(z);
    else assert.equal(s.serie.length, 23, `zona ${z}: ${s.serie.length} semestri invece di 23 (dal 2014-2 al 2025-2, uno ogni semestre)`);
    for (let i = 1; i < s.serie.length; i++) assert.ok(s.serie[i].s > s.serie[i - 1].s, `zona ${z}: serie non ordinata`);
  }
  assert.deepEqual(nuove.sort(), ["D37", "D38", "D39", "D40"]);
});

test("l'ultimo semestre dello storico coincide con le quotazioni caricate", () => {
  for (const z of Object.keys(ZONE)) {
    const s = STORICO.zone[z];
    const ultimo = s.serie[s.serie.length - 1];
    assert.equal(ultimo.s, SEM);
    const c = ZONE[z].civ[s.stato];
    assert.deepEqual(ultimo.c, c, `zona ${z}: storico e quotazioni non coincidono`);
  }
});

/* Le funzioni: compilate al volo come il motore, cosi' il test gira sul codice vero. */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(RADICE, ".calibrazione/build-test");
execSync(`npx tsc src/lib/affitto.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`, { cwd: RADICE, stdio: "inherit" });
const req = createRequire(import.meta.url);
const affitto = req(join(BUILD, "src/lib/affitto.js"));
const motore = req(join(BUILD, "src/lib/engine.js"));

const CASA = { zona: "C18", tipo: "civ", mq: 85, stato: "abit", piano: "1-2", ascensore: true, classe: "D", balconi: 0, cantina: false, box: "nessuno", epoca: null, affaccio: null, metro: null };

test("il canone segue il prezzo: stessa casa, stato migliore, canone piu' alto", () => {
  const a = affitto.rendita(CASA, motore.stima(CASA));
  const b = affitto.rendita({ ...CASA, stato: "otti" }, motore.stima({ ...CASA, stato: "otti" }));
  assert.ok(b.canoneMese > a.canoneMese);
  assert.ok(a.lordo > 0.02 && a.lordo < 0.08, `rendimento lordo ${a.lordo}`);
  assert.ok(a.netto < a.lordo);
});

test("al pareggio l'affitto breve rende esattamente quanto il 4+4", () => {
  const s = motore.stima(CASA);
  const lungo = affitto.rendita(CASA, s);
  const ip = { ...affitto.IPOTESI_BREVE_BASE, tariffa: affitto.tariffaPrudente(lungo.canoneMese) };
  const b = affitto.affittoBreve(ip, lungo, s);
  assert.ok(b.pareggio !== null && b.pareggio > 0.2 && b.pareggio < 0.95, `pareggio ${b.pareggio}`);
  const al = affitto.affittoBreve({ ...ip, occupazione: b.pareggio }, lungo, s);
  assert.ok(Math.abs(al.netto - lungo.annuoNetto) < 1, `${al.netto} vs ${lungo.annuoNetto}`);
});

test("l'andamento di una zona storica parte dal 2014-2 e quello di una nuova lo dice", () => {
  const c18 = affitto.andamento("C18");
  assert.equal(c18.dal, "2014-2");
  assert.equal(c18.punti.length, 23);
  assert.ok(c18.variazione > 0);
  const d37 = affitto.andamento("D37");
  assert.equal(d37.nuova, true);
});
