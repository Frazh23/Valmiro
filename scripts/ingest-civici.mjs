/**
 * Costruisce l'indirizzario di Milano dai numeri civici del Comune.
 *
 * Fonte: Comune di Milano, dataset DS634 "Numeri civici con coordinate
 * geografiche" (CC BY 4.0). Il file grezzo non entra nel repo: pesa 22 MB e
 * viene ripubblicato periodicamente. Si scarica dal portale open data e si
 * passa a questo script, che produce due file versionati:
 *
 *   data/vie-milano.json    l'elenco delle vie, per i suggerimenti mentre scrivi
 *   data/civici-milano.json ogni civico con coordinate e zona OMI gia' risolta
 *
 * Il punto del lavoro e' proprio quest'ultimo: la zona OMI di ogni civico
 * viene calcolata qui, una volta sola, con lo stesso point-in-polygon che usa
 * l'applicazione. A runtime cercare un indirizzo diventa una lettura, non una
 * chiamata di rete: niente limite di una richiesta al secondo, niente civici
 * mancanti perche' OpenStreetMap non li ha mai avuti.
 *
 *   node scripts/ingest-civici.mjs percorso/al/ds634.csv
 */

import { createReadStream, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFileSync } from "node:fs";

const QUI = dirname(fileURLToPath(import.meta.url));
const RADICE = process.env.RADICE_PROGETTO || join(QUI, "..");
const DATI = join(RADICE, "data");

// ---------------------------------------------------------------- poligoni

/**
 * Gli stessi poligoni di src/lib/geo.ts, ricaricati qui perche' lo script gira
 * in Node puro e non passa dal compilatore TypeScript. La logica e' copiata di
 * proposito, non importata: se un giorno divergesse, il test se ne accorge.
 */
const geo = JSON.parse(readFileSync(join(DATI, "zone-omi.json"), "utf8"));

const POLIGONI = {};
for (const f of geo.features) {
  const g = f.geometry;
  POLIGONI[f.properties.Zona] =
    g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
}

function dentroAnello(lon, lat, r) {
  let dentro = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function zonaDelPunto(lon, lat) {
  for (const zona in POLIGONI) {
    for (const poly of POLIGONI[zona]) {
      let dentro = false;
      for (const anello of poly) if (dentroAnello(lon, lat, anello)) dentro = !dentro;
      if (dentro) return zona;
    }
  }
  return null;
}

/**
 * Il point-in-polygon su 42 zone per 65.000 civici sarebbe mezzo milione di
 * attraversamenti di anelli. Il rettangolo che racchiude ogni zona scarta in
 * una manciata di confronti tutte quelle che non possono contenere il punto.
 */
const RIQUADRI = {};
for (const zona in POLIGONI) {
  let lonMin = 180, latMin = 90, lonMax = -180, latMax = -90;
  for (const poly of POLIGONI[zona])
    for (const anello of poly)
      for (const [x, y] of anello) {
        if (x < lonMin) lonMin = x;
        if (x > lonMax) lonMax = x;
        if (y < latMin) latMin = y;
        if (y > latMax) latMax = y;
      }
  RIQUADRI[zona] = { lonMin, latMin, lonMax, latMax };
}

function zonaVeloce(lon, lat) {
  for (const zona in POLIGONI) {
    const r = RIQUADRI[zona];
    if (lon < r.lonMin || lon > r.lonMax || lat < r.latMin || lat > r.latMax) continue;
    for (const poly of POLIGONI[zona]) {
      let dentro = false;
      for (const anello of poly) if (dentroAnello(lon, lat, anello)) dentro = !dentro;
      if (dentro) return zona;
    }
  }
  return null;
}

// ------------------------------------------------------------------- nomi

/** Iniziali maiuscole, rispettando le particelle: "DELLA MAGGIOLINA" -> "della Maggiolina". */
const MINUSCOLE = new Set([
  "di", "del", "dei", "della", "delle", "degli", "dello", "da", "dal", "dalla",
  "de", "e", "in", "il", "lo", "la", "le", "al", "alla", "ai", "agli", "a",
  // elisioni: l'apostrofo viene separato, quindi la particella arriva monca
  "d", "l", "dell", "dall", "all", "nell", "sull", "un",
]);

function titolo(s) {
  return s
    .toLowerCase()
    .split(/(\s+|')/)
    .map((p, i) => {
      if (/^\s+$/.test(p) || p === "'") return p;
      if (i > 0 && MINUSCOLE.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("");
}

/** Chiave di confronto: niente accenti, niente punteggiatura, spazi normalizzati. */
export function normalizza(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ----------------------------------------------------------------- lettura

const CSV = process.argv[2];
if (!CSV) {
  console.error("Uso: node scripts/ingest-civici.mjs percorso/al/ds634.csv");
  process.exit(1);
}

/** Quanto vale un record quando due ingressi portano lo stesso numero. */
function punteggio(stato, residenziale) {
  return (stato === "Applicato" ? 2 : 0) + (residenziale === "1" ? 1 : 0);
}

const vie = new Map(); // chiave normalizzata -> { nome, civici: Map }

let intestazione = null;
let righe = 0, scartate = 0, fuoriZona = 0;

const flusso = createInterface({
  input: createReadStream(resolve(CSV), "utf8"),
  crlfDelay: Infinity,
});

for await (const riga of flusso) {
  if (!intestazione) {
    intestazione = riga.split(";");
    continue;
  }
  if (!riga.trim()) continue;

  const c = riga.split(";");
  const col = (nome) => c[intestazione.indexOf(nome)] ?? "";

  const tipo = col("TIPO").trim();
  const descrittivo = col("DESCRITTIVO").trim();
  const numero = col("NUMERO").trim();
  const lettera = col("LETTERA").trim();
  const lon = Number(col("LONG_WGS84"));
  const lat = Number(col("LAT_WGS84"));

  righe++;

  if (!tipo || !descrittivo || !numero || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    scartate++;
    continue;
  }

  // Il titolo si applica alla stringa intera, non al solo descrittivo: nei
  // "Bastioni di Porta Nuova" la particella e' la prima parola del descrittivo
  // ma non del nome, e capitalizzarla la farebbe sembrare un cognome.
  const nome = titolo(`${tipo} ${descrittivo}`);
  const chiave = normalizza(nome);
  // "12" e "12/A" restano civici diversi; "12N04" e' l'ingresso interno del 12
  // e non interessa a chi cerca un indirizzo.
  const civico = lettera ? `${numero}/${lettera.toUpperCase()}` : numero;

  if (!vie.has(chiave)) vie.set(chiave, { nome, civici: new Map() });
  const via = vie.get(chiave);

  const p = punteggio(col("STATOCIVICO").trim(), col("RESIDENZIALE").trim());
  const esistente = via.civici.get(civico);
  if (esistente && esistente.p >= p) continue;

  via.civici.set(civico, { n: Number(numero), lon, lat, p });
}

// ------------------------------------------------------------------- zone

const arrotonda = (n) => Math.round(n * 1e5) / 1e5;

const indice = [];
const civiciPerVia = {};

for (const [chiave, via] of [...vie.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const elenco = [...via.civici.entries()]
    .map(([civico, d]) => ({ civico, ...d, zona: zonaVeloce(d.lon, d.lat) }))
    .sort((a, b) => a.n - b.n || a.civico.localeCompare(b.civico));

  const conteggio = {};
  let sommaLon = 0, sommaLat = 0, conZona = 0;
  for (const e of elenco) {
    sommaLon += e.lon;
    sommaLat += e.lat;
    if (e.zona) {
      conteggio[e.zona] = (conteggio[e.zona] || 0) + 1;
      conZona++;
    } else fuoriZona++;
  }

  const zone = Object.entries(conteggio).sort((a, b) => b[1] - a[1]);
  // Una via senza nemmeno un civico dentro i confini OMI e' fuori Milano o su
  // un bordo: non entra nell'indirizzario, perche' non sapremmo valutarla.
  if (!zone.length) continue;

  indice.push({
    nome: via.nome,
    chiave,
    zona: zone[0][0],
    zone: zone.length > 1 ? zone.map(([z]) => z) : undefined,
    civici: elenco.length,
    lon: arrotonda(sommaLon / elenco.length),
    lat: arrotonda(sommaLat / elenco.length),
    copertura: Math.round((conZona / elenco.length) * 100),
  });

  civiciPerVia[chiave] = elenco.map((e) => [
    e.civico,
    arrotonda(e.lon),
    arrotonda(e.lat),
    e.zona,
  ]);
}

// ------------------------------------------------------------------ uscita

const meta = {
  fonte: "Comune di Milano — DS634 Numeri civici con coordinate geografiche (CC BY 4.0)",
  aggiornamento: "2026-08-01",
  generato: new Date().toISOString().slice(0, 10),
  vie: indice.length,
  civici: Object.values(civiciPerVia).reduce((s, v) => s + v.length, 0),
};

mkdirSync(DATI, { recursive: true });
writeFileSync(join(DATI, "vie-milano.json"), JSON.stringify({ meta, vie: indice }));
writeFileSync(join(DATI, "civici-milano.json"), JSON.stringify({ meta, civici: civiciPerVia }));

const multizona = indice.filter((v) => v.zone).length;
console.log(`righe lette         ${righe}`);
console.log(`righe scartate      ${scartate}`);
console.log(`vie                 ${indice.length}`);
console.log(`civici              ${meta.civici}`);
console.log(`civici fuori zona   ${fuoriZona}`);
console.log(`vie su piu' zone    ${multizona}`);
