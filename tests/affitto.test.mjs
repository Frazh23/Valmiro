import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* Verita' sui dati di locazione e sullo storico: le stesse invarianti che
   affitto.ts da' per scontate. Se un ingest le rompe, si sa qui. */

const ZONE = JSON.parse(readFileSync(new URL("../data/quotazioni-omi-2024-2.json", import.meta.url)));
const LOC = JSON.parse(readFileSync(new URL("../data/locazioni-omi-2024-2.json", import.meta.url)));
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

test("lo storico copre tutte le zone, dal 2° semestre 2014 salvo le quattro nate nel 2024", () => {
  const nuove = [];
  for (const z of Object.keys(ZONE)) {
    const s = STORICO.zone[z];
    assert.ok(s && s.serie.length, `zona ${z} senza storico`);
    if (s.dal !== "2014-2") nuove.push(z);
    else assert.equal(s.serie.length, 21, `zona ${z}: ${s.serie.length} semestri invece di 21`);
    for (let i = 1; i < s.serie.length; i++) assert.ok(s.serie[i].s > s.serie[i - 1].s, `zona ${z}: serie non ordinata`);
  }
  assert.deepEqual(nuove.sort(), ["D37", "D38", "D39", "D40"]);
});

test("l'ultimo semestre dello storico coincide con le quotazioni caricate", () => {
  for (const z of Object.keys(ZONE)) {
    const s = STORICO.zone[z];
    const ultimo = s.serie[s.serie.length - 1];
    assert.equal(ultimo.s, "2024-2");
    const c = ZONE[z].civ[s.stato];
    assert.deepEqual(ultimo.c, c, `zona ${z}: storico e quotazioni non coincidono`);
  }
});
