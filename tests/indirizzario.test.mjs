/* --------------------------------------------------------------------------
   L'indirizzario. Non e' un test della ricerca in astratto: e' il test che i
   dati che spediamo dicono la verita' su Milano.

   I moduli di src/lib sono TypeScript e questi test girano in Node puro, quindi
   qui si legge il JSON e si riproduce la sola logica di confronto. La copia e'
   voluta: se domani indirizzario.ts cambiasse regola senza cambiare i dati, il
   test resterebbe verde a torto — ma il caso opposto, dati che si guastano
   silenziosamente durante un nuovo ingest, e' quello che fa danni davvero.
   -------------------------------------------------------------------------- */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const INDICE = JSON.parse(readFileSync(new URL("../data/vie-milano.json", import.meta.url), "utf8"));
const CIVICI = JSON.parse(readFileSync(new URL("../data/civici-milano.json", import.meta.url), "utf8")).civici;
const VIE = INDICE.vie;
const GEO = JSON.parse(readFileSync(new URL("../data/zone-omi.json", import.meta.url), "utf8"));
const QUOTAZIONI = JSON.parse(readFileSync(new URL("../data/quotazioni-omi-2024-2.json", import.meta.url), "utf8"));

const via = (chiave) => VIE.find((v) => v.chiave === chiave);

test("l'indirizzario copre Milano intera, non un campione", () => {
  assert.ok(VIE.length > 3500, `solo ${VIE.length} vie: l'ingest ha perso qualcosa`);
  assert.ok(INDICE.meta.civici > 50000, `solo ${INDICE.meta.civici} civici`);
  // Il dizionario che sostituisce ne aveva 141: il salto deve essere di scala.
  assert.ok(VIE.length > 141 * 10);
});

test("le vie che tutti conoscono ci sono, scritte come si scrivono", () => {
  for (const [chiave, atteso] of [
    ["via torino", "Via Torino"],
    ["piazza del duomo", "Piazza del Duomo"],
    ["corso sempione", "Corso Sempione"],
    ["via dell orso", "Via dell'Orso"],
    ["bastioni di porta nuova", "Bastioni di Porta Nuova"],
    ["corso giuseppe garibaldi", "Corso Giuseppe Garibaldi"],
    // Il Comune la scrive staccata; tutti la scrivono attaccata. La ricerca
    // riconcilia le due forme, ma solo se il dato resta questo.
    ["via monte napoleone", "Via Monte Napoleone"],
    ["corso buenos aires", "Corso Buenos Aires"],
  ]) {
    const v = via(chiave);
    assert.ok(v, `${chiave} manca`);
    assert.equal(v.nome, atteso);
  }
});

test("nessun nome di via ha una particella maiuscola in mezzo", () => {
  const brutti = VIE.filter((v) =>
    / (Di|Del|Della|Dei|Delle|Degli|Dello|Da|Dal|Dalla|De|In|Al|Alla|Ai|Agli|Dell|All|Nell|Sull|D|L)[ ']/.test(v.nome)
  );
  assert.deepEqual(brutti.map((v) => v.nome), []);
});

test("ogni via ha una zona che sappiamo quotare", () => {
  const quotate = new Set(Object.keys(QUOTAZIONI.zone || QUOTAZIONI));
  const orfane = VIE.filter((v) => !quotate.has(v.zona));
  assert.ok(
    orfane.length < VIE.length * 0.05,
    `${orfane.length} vie su ${VIE.length} puntano a una zona senza quotazione: ${orfane.slice(0, 5).map((v) => `${v.nome} → ${v.zona}`).join(", ")}`
  );
});

test("le zone dichiarate esistono davvero nei poligoni", () => {
  const reali = new Set(GEO.features.map((f) => f.properties.Zona));
  for (const v of VIE) {
    assert.ok(reali.has(v.zona), `${v.nome} punta alla zona inesistente ${v.zona}`);
    for (const z of v.zone || []) assert.ok(reali.has(z), `${v.nome} cita la zona inesistente ${z}`);
  }
});

test("Via Torino attraversa piu' zone, ed e' il motivo per cui il civico conta", () => {
  const v = via("via torino");
  assert.ok(v.zone && v.zone.length > 1, "Via Torino deve risultare multizona");
  const lista = CIVICI["via torino"];
  const zone = new Set(lista.map((c) => c[3]));
  assert.ok(zone.size > 1, "i civici di Via Torino devono cadere in zone diverse");
});

test("Via Torino 12 non esiste, ed e' un fatto dell'anagrafe non un guasto nostro", () => {
  /* Era il bug che ci ha portati qui: la ricerca falliva e sembrava colpa del
     geocoder. Il Comune non ha quel civico — i numeri saltano dal 4 al 15. Il
     test blocca la tentazione di "aggiustarlo" inventando un punto. */
  const lista = CIVICI["via torino"];
  assert.equal(lista.find((c) => c[0] === "12"), undefined);
  assert.ok(lista.find((c) => c[0] === "4"), "il 4 invece c'e'");
  assert.ok(lista.find((c) => c[0] === "15"), "e il 15 anche");
});

test("i buchi nella numerazione sono reali e hanno due estremi", () => {
  /* Quando un civico non esiste proponiamo quello prima e quello dopo. Il caso
     si regge sul fatto che i buchi esistano davvero: se un ingest futuro
     "riempisse" la numerazione interpolando, questo test lo scoprirebbe. */
  const numeri = (chiave) => CIVICI[chiave].map((c) => parseInt(c[0], 10)).filter(Number.isFinite);
  const torino = numeri("via torino");
  assert.ok(Math.max(...torino) > torino.length, "Via Torino deve avere numeri mancanti");
  const monza = numeri("viale monza");
  assert.ok(!monza.includes(100) && monza.includes(94) && monza.includes(101),
    "Viale Monza: il 100 manca, il 94 e il 101 ci sono");
});

test("le coordinate stanno dentro Milano, sempre", () => {
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  for (const f of GEO.features) {
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const p of polys) for (const r of p) for (const [x, y] of r) {
      if (y < latMin) latMin = y; if (y > latMax) latMax = y;
      if (x < lonMin) lonMin = x; if (x > lonMax) lonMax = x;
    }
  }
  let fuori = 0, totale = 0;
  for (const lista of Object.values(CIVICI))
    for (const [, lon, lat] of lista) {
      totale++;
      if (lon < lonMin || lon > lonMax || lat < latMin || lat > latMax) fuori++;
    }
  assert.equal(fuori, 0, `${fuori} civici su ${totale} fuori dal riquadro di Milano`);
});

test("ogni via dell'indice ha i suoi civici, e viceversa", () => {
  for (const v of VIE) {
    const lista = CIVICI[v.chiave];
    assert.ok(lista, `${v.nome} non ha civici`);
    assert.equal(lista.length, v.civici, `${v.nome}: indice dice ${v.civici}, elenco ne ha ${lista.length}`);
  }
  assert.equal(Object.keys(CIVICI).length, VIE.length);
});

test("una via dichiarata su una zona sola ha davvero tutti i civici li'", () => {
  const singole = VIE.filter((v) => !v.zone);
  assert.ok(singole.length > VIE.length * 0.8, "la gran parte delle vie deve stare in una zona sola");
  for (const v of singole.slice(0, 300)) {
    const zone = new Set(CIVICI[v.chiave].map((c) => c[3]).filter(Boolean));
    assert.ok(zone.size <= 1, `${v.nome} e' dichiarata su ${v.zona} ma i civici stanno in ${[...zone]}`);
  }
});
