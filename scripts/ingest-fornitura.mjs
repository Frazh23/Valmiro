/**
 * La fornitura ufficiale dell'Agenzia delle Entrate per un semestre.
 *
 * L'Agenzia consegna tre file per comune e semestre (QIP):
 *   *_VALORI.csv   prezzi (euro/mq) e canoni (euro/mq al mese) per zona,
 *                  tipologia e stato, con il riferimento alla superficie (L/N)
 *   *_ZONE.csv     le zone con fascia, descrizione e tipologia prevalente
 *   F205.kml       i perimetri delle zone (F205 e' il codice catastale di Milano)
 *
 * Da qui escono i file versionati che il sito usa:
 *   data/quotazioni-omi-AAAA-S.json    prezzi, nello stesso tracciato di sempre
 *   data/locazioni-omi-AAAA-S.json     canoni
 *   data/zone-omi-milano-AAAA-S.geojson  i perimetri, in GeoJSON
 *   data/zone-omi.json                 gli stessi, il file che usa geo.ts
 *   data/zone-omi-semplificate.json    gli stessi ridotti, per la mappa
 *   data/omi-storico.json              a cui si aggiunge il semestre nuovo
 *
 * E si stampa cosa e' cambiato rispetto ai dati caricati: zone mancanti o
 * nuove, quotazioni che si muovono, perimetri che si spostano (in km2 e in
 * percentuale dell'area della zona). Quando cambia un perimetro vanno
 * rigenerati i civici: lo dice alla fine.
 *
 *   node scripts/ingest-fornitura.mjs VALORI.csv ZONE.csv F205.kml
 *
 * Si rifiuta di scrivere se le superfici non sono tutte "L" (lorda): il
 * motore ragiona in superficie commerciale, e una quotazione al netto
 * sarebbe un altro numero.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const QUI = dirname(fileURLToPath(import.meta.url));
const RADICE = process.env.RADICE_PROGETTO || join(QUI, "..");
const DATI = join(RADICE, "data");

const [VALORI, ZONE_CSV, KML] = process.argv.slice(2);
if (!VALORI || !ZONE_CSV || !KML) {
  console.error("Uso: node scripts/ingest-fornitura.mjs VALORI.csv ZONE.csv F205.kml");
  process.exit(1);
}

const TIPI = { "Abitazioni civili": "civ", "Abitazioni signorili": "sig", "Abitazioni di tipo economico": "eco", "Ville e Villini": "vil", Box: "box" };
const num = (s) => { const v = parseFloat((s || "").trim().replace(",", ".")); return Number.isFinite(v) ? v : null; };

/** I CSV dell'Agenzia hanno una riga di titolo prima dell'intestazione e un ";" finale. */
function leggiQip(percorso) {
  const righe = readFileSync(resolve(percorso), "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((r) => r.trim());
  const titolo = righe.shift();
  const m = titolo.match(/Semestre\s+(\d{4})\/(\d)/);
  if (!m) throw new Error(`Titolo non riconosciuto: ${titolo}`);
  const testata = righe.shift().split(";").map((s) => s.trim());
  const record = righe.map((r) => { const c = r.split(";"); const o = {}; testata.forEach((n, i) => { if (n) o[n] = (c[i] ?? "").trim(); }); return o; });
  return { semestre: `${m[1]}-${m[2]}`, etichetta: `${m[1]} · ${m[2]}° semestre`, record };
}

// ------------------------------------------------------------------ valori

const valori = leggiQip(VALORI);
const zoneCsv = leggiQip(ZONE_CSV);
if (valori.semestre !== zoneCsv.semestre) throw new Error(`VALORI e ZONE sono di semestri diversi: ${valori.semestre} / ${zoneCsv.semestre}`);
const SEM = valori.semestre;

const nonLorde = valori.record.filter((r) => TIPI[r.Descr_Tipologia] && (r.Sup_NL_compr !== "L" || (r.Loc_min && r.Sup_NL_loc !== "L")));
if (nonLorde.length) throw new Error(`${nonLorde.length} righe residenziali con superficie non lorda: il tracciato e' cambiato, non scrivo`);

/** Le descrizioni curate di oggi restano; per una zona nuova si prende quella dell'Agenzia, in minuscolo.
    "Precedente" e' l'ultimo file di quotazioni presente in data/ che non sia questo semestre. */
const precedente = (() => {
  const f = readdirSync(DATI).filter((n) => /^quotazioni-omi-\d{4}-\d\.json$/.test(n) && !n.includes(SEM)).sort().pop();
  return f ? JSON.parse(readFileSync(join(DATI, f), "utf8")) : {};
})();
const titolo = (s) => s.toLowerCase().replace(/^'|'$/g, "").replace(/\s*-\s*/g, " · ").replace(/\s*,\s*/g, ", ").replace(/(^|[\s·,(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

const descrizioni = {};
for (const r of zoneCsv.record) descrizioni[r.Zona] = { d: titolo(r.Zona_Descr), f: r.Fascia, link: r.LinkZona, prev: r.Descr_tip_prev };

const quotazioni = {};
const locazioni = {};
let righeUsate = 0;
for (const r of valori.record) {
  const tipo = TIPI[r.Descr_Tipologia];
  if (!tipo) continue;
  const z = r.Zona;
  const q = (quotazioni[z] ||= { d: precedente[z]?.d || descrizioni[z]?.d || z, f: r.Fascia, civ: {}, sig: {}, eco: {}, vil: {}, box: null });
  const l = (locazioni[z] ||= { civ: {}, sig: {}, eco: {}, vil: {} });
  const cmin = num(r.Compr_min), cmax = num(r.Compr_max), lmin = num(r.Loc_min), lmax = num(r.Loc_max);
  if (!cmin || !cmax) continue;
  const stato = (r.Stato || "NORMALE").trim() || "NORMALE";
  if (tipo === "box") q.box = [cmin, cmax];
  else {
    q[tipo][stato] = [cmin, cmax];
    if (lmin && lmax) l[tipo][stato] = [lmin, lmax];
  }
  righeUsate++;
}
const zoneQuotate = Object.keys(quotazioni).filter((z) => Object.keys(quotazioni[z].civ).length).sort();
if (zoneQuotate.length < 30) throw new Error(`solo ${zoneQuotate.length} zone con abitazioni civili: tracciato sospetto, non scrivo`);
for (const z of Object.keys(quotazioni)) if (!zoneQuotate.includes(z)) { delete quotazioni[z]; delete locazioni[z]; }

// --------------------------------------------------------------- perimetri

function leggiKml(percorso) {
  const k = readFileSync(resolve(percorso), "utf8");
  const zone = {};
  for (const pm of k.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
    const corpo = pm[1];
    const z = corpo.match(/<Data name="CODZONA">[\s\S]*?<value>(.*?)<\/value>/)?.[1]?.trim();
    if (!z) continue;
    const anello = (s) => s.trim().split(/\s+/).map((c) => c.split(",").slice(0, 2).map(Number));
    const poligoni = [];
    for (const p of corpo.matchAll(/<Polygon>([\s\S]*?)<\/Polygon>/g)) {
      const esterno = p[1].match(/<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/)?.[1];
      if (!esterno) continue;
      const interni = [...p[1].matchAll(/<innerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/g)].map((m) => anello(m[1]));
      poligoni.push([anello(esterno), ...interni]);
    }
    zone[z] = poligoni;
  }
  return zone;
}

const perimetri = leggiKml(KML);
const geojson = {
  type: "FeatureCollection",
  name: `zone-omi-milano-${SEM}`,
  crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  features: Object.keys(perimetri).sort().map((z) => ({
    type: "Feature",
    properties: {
      Name: `MILANO - Zona OMI ${z}`, "Anno / Semestre": SEM.replace("-", " / "),
      Fascia: descrizioni[z]?.f || z[0], Zona_Descr: descrizioni[z]?.d || z, Zona: z, LinkZona: descrizioni[z]?.link || "",
      Descr_tip_prev: descrizioni[z]?.prev || "",
    },
    geometry: perimetri[z].length === 1
      ? { type: "Polygon", coordinates: perimetri[z][0] }
      : { type: "MultiPolygon", coordinates: perimetri[z] },
  })),
};

/** Douglas-Peucker: la mappa nel browser non ha bisogno di ogni marciapiede. */
function semplifica(anello, tol) {
  if (anello.length < 5) return anello;
  const dist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };
  const tieni = new Array(anello.length).fill(false);
  tieni[0] = tieni[anello.length - 1] = true;
  const pila = [[0, anello.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let max = 0, k = -1;
    for (let n = i + 1; n < j; n++) { const d = dist(anello[n], anello[i], anello[j]); if (d > max) { max = d; k = n; } }
    if (max > tol && k > 0) { tieni[k] = true; pila.push([i, k], [k, j]); }
  }
  const out = anello.filter((_, n) => tieni[n]);
  return out.length >= 4 ? out : anello;
}
const arr = (n) => Math.round(n * 1e5) / 1e5;
const TOLLERANZA = 0.00012; // ~10 metri: dove stavano i 3.700 vertici della mappa di prima
const semplificate = {};
let vertici = 0;
for (const z of Object.keys(perimetri).sort()) {
  semplificate[z] = perimetri[z].map((poly) => poly.map((ring) => semplifica(ring, TOLLERANZA).map(([x, y]) => [arr(x), arr(y)])));
  for (const poly of semplificate[z]) for (const ring of poly) vertici += ring.length;
}

// ------------------------------------------------------------------ storico

const storicoFile = join(DATI, "omi-storico.json");
let storico = existsSync(storicoFile) ? JSON.parse(readFileSync(storicoFile, "utf8")) : { meta: {}, zone: {} };
let aggiunti = 0;
for (const z of zoneQuotate) {
  const s = (storico.zone[z] ||= { dal: SEM, stato: quotazioni[z].civ.NORMALE ? "NORMALE" : "OTTIMO", serie: [] });
  const stato = s.stato;
  const c = quotazioni[z].civ[stato], l = locazioni[z].civ[stato];
  if (!c) continue;
  if (s.serie.some((p) => p.s === SEM)) continue;
  s.serie.push({ s: SEM, c, l: l || [null, null] });
  s.serie.sort((a, b) => (a.s < b.s ? -1 : 1));
  aggiunti++;
}
storico.meta = { ...storico.meta, semestre: SEM, generato: new Date().toISOString().slice(0, 10) };

// ------------------------------------------------------------------ confronto

const vecchioGeo = existsSync(join(DATI, "zone-omi.json")) ? JSON.parse(readFileSync(join(DATI, "zone-omi.json"), "utf8")) : null;
const kx = 111.32 * Math.cos((45.47 * Math.PI) / 180), ky = 110.95;
function areaKm2(polys) {
  let a = 0;
  for (const poly of polys) poly.forEach((ring, i) => {
    let s = 0;
    for (let j = 0; j < ring.length - 1; j++) s += ring[j][0] * kx * ring[j + 1][1] * ky - ring[j + 1][0] * kx * ring[j][1] * ky;
    a += (Math.abs(s) / 2) * (i === 0 ? 1 : -1);
  });
  return a;
}
function dentro(polys, x, y) {
  let d = false;
  for (const poly of polys) {
    let inPoly = false;
    for (const ring of poly) {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      if (c) inPoly = !inPoly;
    }
    if (inPoly) d = true;
  }
  return d;
}
/** Differenza simmetrica su una griglia di 40 metri: basta per dire se un confine si e' mosso. */
function differenzaKm2(a, b) {
  const tutti = [...a, ...b].flat(2);
  const xs = tutti.map((p) => p[0]), ys = tutti.map((p) => p[1]);
  const passoX = 0.04 / kx, passoY = 0.04 / ky;
  let n = 0;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += passoX)
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += passoY)
      if (dentro(a, x, y) !== dentro(b, x, y)) n++;
  return n * 0.04 * 0.04;
}

const vecchieZone = new Set(Object.keys(precedente));
const nuoveZone = zoneQuotate.filter((z) => !vecchieZone.has(z));
const mancanti = [...vecchieZone].filter((z) => !zoneQuotate.includes(z));

console.log(`\nFORNITURA ${valori.etichetta} · ${righeUsate} righe residenziali usate · ${zoneQuotate.length} zone quotate · ${Object.keys(perimetri).length} perimetri`);
console.log(`zone nuove: ${nuoveZone.length ? nuoveZone.join(", ") : "nessuna"} · zone mancanti: ${mancanti.length ? mancanti.join(", ") : "nessuna"}`);
const senzaPerimetro = zoneQuotate.filter((z) => !perimetri[z]);
if (senzaPerimetro.length) console.log(`ATTENZIONE zone quotate senza perimetro nel KML: ${senzaPerimetro.join(", ")}`);

console.log("\nabitazioni civili, stato normale: mediana euro/mq e canone, prima -> dopo");
const variazioni = [];
for (const z of zoneQuotate) {
  const p = precedente[z]?.civ?.NORMALE || precedente[z]?.civ?.OTTIMO;
  const n = quotazioni[z].civ.NORMALE || quotazioni[z].civ.OTTIMO;
  if (!p || !n) continue;
  const v = (n[0] + n[1]) / (p[0] + p[1]) - 1;
  variazioni.push(v);
  console.log(`  ${z.padEnd(4)} ${String(Math.round((p[0] + p[1]) / 2)).padStart(6)} -> ${String(Math.round((n[0] + n[1]) / 2)).padStart(6)}  ${(v >= 0 ? "+" : "") + (v * 100).toFixed(1)}%`);
}
if (variazioni.length) {
  const s = [...variazioni].sort((a, b) => a - b);
  console.log(`  mediana della variazione: ${(s[s.length >> 1] * 100).toFixed(1)}%`);
}

if (vecchioGeo) {
  console.log("\nperimetri: zone il cui confine si e' spostato (griglia 40 m)");
  let spostate = 0;
  for (const f of vecchioGeo.features) {
    const z = f.properties.Zona;
    if (!perimetri[z]) { console.log(`  ${z}: perimetro sparito`); continue; }
    const vecchio = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    const d = differenzaKm2(vecchio.map((p) => p.map((r) => r.map((c) => c.slice(0, 2)))), perimetri[z]);
    const a = areaKm2(perimetri[z]);
    if (d > 0.0032) { spostate++; console.log(`  ${z.padEnd(4)} ${d.toFixed(3)} km2 su ${a.toFixed(2)} (${((d / a) * 100).toFixed(2)}%)`); }
  }
  if (!spostate) console.log("  nessuna");
  else console.log(`  -> rigenera i civici: npm run ingest-civici data/ds634*.csv`);
}

// ------------------------------------------------------------------ scrittura

writeFileSync(join(DATI, `quotazioni-omi-${SEM}.json`), JSON.stringify(quotazioni));
writeFileSync(join(DATI, `locazioni-omi-${SEM}.json`), JSON.stringify(locazioni));
writeFileSync(join(DATI, `zone-omi-milano-${SEM}.geojson`), JSON.stringify(geojson));
writeFileSync(join(DATI, "zone-omi.json"), JSON.stringify(geojson));
writeFileSync(join(DATI, "zone-omi-semplificate.json"), JSON.stringify(semplificate));
writeFileSync(storicoFile, JSON.stringify(storico));

console.log(`\nscritti: quotazioni-omi-${SEM}.json, locazioni-omi-${SEM}.json, zone-omi-milano-${SEM}.geojson, zone-omi.json, zone-omi-semplificate.json (${vertici} vertici), omi-storico.json (+${aggiunti} zone al ${SEM})`);
console.log(`ORA: in src/lib/data.ts e src/lib/affitto.ts punta gli import ai file ${SEM}, aggiorna SEMESTRE e INDICE_ISTAT, poi npm test`);
