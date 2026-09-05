/**
 * Esperimento 1b: i comparabili al civico riducono l'errore?
 *
 *   node scripts/comparabili.mjs [data/calibrazione/xxx.csv]
 *
 * Per ogni annuncio geolocalizzato al civico (indirizzario del Comune) si
 * calcola il residuo del motore, log(prezzo / stima), e si prova a correggere
 * la stima con i residui degli annunci vicini, escludendo l'annuncio stesso
 * (leave-one-out) e i suoi duplicati. Si provano raggio, decadimento con la
 * distanza, peso a priori (k0), tetto alla correzione, e le varianti: k vicini
 * piu' prossimi, mediana per zona, stessa via.
 *
 * Esito del 5 settembre 2026 su 147 annunci al civico: MAD da 12,9% a 11,4%
 * nel caso migliore. Un punto e mezzo, non il salto al 6-8%: con 150 annunci
 * sparsi su una citta' la media di pochi vicini rumorosi non basta. La
 * dispersione sta quasi tutta nel segmento signorile (MAD 19%, mediano +14%);
 * senza, il motore fa MAD 10,1% e mediano -0,7%. Dettagli nel documento di
 * progetto "calibrazione-motore".
 *
 * Non scrive nulla: misura.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = `${RADICE}/.calibrazione/build`;
execSync(`npx tsc src/lib/engine.ts src/lib/indirizzario.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`, { cwd: RADICE, stdio: "inherit" });
const require = createRequire(import.meta.url);
const motore = require(`${BUILD}/src/lib/engine.js`);
const ind = require(`${BUILD}/src/lib/indirizzario.js`);

const CSV = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(RADICE, "data/calibrazione/dataset-fz-2026-09-05.csv");
const righe = readFileSync(CSV, "utf8").split(/\r?\n/).filter((r) => r.trim());
const testata = righe.shift().split(";").map((s) => s.trim());
const col = (r, n) => (r[testata.indexOf(n)] ?? "").trim();
const siNo = (v) => /^(si|sì|s|true|1|x)$/i.test(v);

const A = [];
let senzaCivico = 0, nonRisolti = 0;
for (const riga of righe) {
  const r = riga.split(";");
  const indirizzo = col(r, "indirizzo");
  if (!indirizzo) continue;
  const ris = ind.risolvi(indirizzo);
  let lon, lat, preciso;
  if (ris.esito === "civico") { lon = ris.lon; lat = ris.lat; preciso = true; }
  else if (ris.esito === "civico-assente" || ris.esito === "via") { lon = ris.via.lon; lat = ris.via.lat; preciso = false; senzaCivico++; }
  else { nonRisolti++; continue; }
  const zona = col(r, "zona") || (ris.esito === "civico" ? ris.zona : ris.via.zona);
  const mq = Number(col(r, "mq")), prezzo = Number(col(r, "prezzo_richiesto"));
  if (!(mq > 0) || !(prezzo > 0)) continue;
  const input = { zona, tipo: col(r, "tipo") || "civ", mq, stato: col(r, "stato") || "abit", piano: col(r, "piano") || "1-2",
    ascensore: siNo(col(r, "ascensore")), classe: (col(r, "classe") || "D").toUpperCase()[0], balconi: Number(col(r, "balconi")) || 0,
    cantina: siNo(col(r, "cantina")), box: col(r, "box") || "nessuno", epoca: null, affaccio: null, metro: null };
  let s; try { s = motore.stima(input); } catch { continue; }
  A.push({ id: col(r, "id"), indirizzo, lon, lat, preciso, zona, mq, prezzo, input, stima: s.pubblica, e: Math.log(prezzo / s.pubblica) });
}
console.log(`annunci ${A.length} · al civico ${A.filter(a => a.preciso).length} · solo via ${senzaCivico} · non risolti ${nonRisolti}`);

const R = 6371000, rad = (x) => (x * Math.PI) / 180;
const dist = (a, b) => { const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon), x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const mediana = (v) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mad = (v) => { const m = mediana(v); return mediana(v.map((x) => Math.abs(x - m))); };
const pct = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
const duplicato = (a, b) => a.indirizzo === b.indirizzo && a.prezzo === b.prezzo && a.mq === b.mq;

function prova({ raggio, tau, k0, cap, soloPrecisi, simile }) {
  const target = A.filter((a) => a.preciso);
  const E = [], usati = [];
  for (const a of target) {
    let sw = 0, swr = 0, n = 0;
    for (const b of A) {
      if (b === a || duplicato(a, b)) continue;
      if (soloPrecisi && !b.preciso) continue;
      const d = dist(a, b);
      if (d > raggio) continue;
      let w = Math.exp(-d / tau);
      if (simile) { if (b.input.tipo !== a.input.tipo) w *= 0.3; if (b.input.stato !== a.input.stato) w *= 0.6; if (!b.preciso) w *= 0.5; }
      sw += w; swr += w * b.e; n++;
    }
    let c = sw > 0 ? swr / (sw + k0) : 0;
    c = Math.max(-cap, Math.min(cap, c));
    E.push(a.e - c); usati.push(n);
  }
  const base = target.map((a) => a.e);
  return { n: target.length, mad0: mad(base), mad1: mad(E), med0: mediana(base), med1: mediana(E),
    d10_0: base.filter((x) => Math.abs(x) <= Math.log(1.1)).length / base.length, d10_1: E.filter((x) => Math.abs(x) <= Math.log(1.1)).length / E.length,
    conVicini: usati.filter((n) => n > 0).length, vicMed: mediana(usati) };
}

const b = prova({ raggio: 1, tau: 1, k0: 1e9, cap: 0, soloPrecisi: true, simile: false });
console.log(`\nBASE (solo annunci al civico, n=${b.n}): mediano ${pct(b.med0)} · MAD ${pct(b.mad0)} · entro ±10% ${(b.d10_0 * 100).toFixed(0)}%\n`);
console.log("raggio  tau   k0   cap   precisi simile | MAD     mediano  ±10%   con vicini  vicini(med)");
for (const raggio of [300, 500, 800, 1200])
  for (const tau of [200, 400, 800])
    for (const k0 of [0.5, 1, 2])
      for (const cap of [0.15, 0.3])
        for (const soloPrecisi of [true, false])
          for (const simile of [false, true]) {
            const r = prova({ raggio, tau, k0, cap, soloPrecisi, simile });
            console.log(`${String(raggio).padEnd(7)} ${String(tau).padEnd(5)} ${String(k0).padEnd(4)} ${String(cap).padEnd(5)} ${String(soloPrecisi).padEnd(7)} ${String(simile).padEnd(6)} | ${pct(r.mad1).padEnd(7)} ${pct(r.med1).padEnd(8)} ${(r.d10_1 * 100).toFixed(0).padEnd(6)} ${String(r.conVicini).padEnd(11)} ${r.vicMed}`);
          }

// --- varianti: k vicini piu' prossimi; correzione per zona (LOO); stessa via
function knn(k, k0, simile) {
  const target = A.filter((a) => a.preciso); const E = [];
  for (const a of target) {
    const vic = A.filter((b) => b !== a && !duplicato(a, b)).map((b) => ({ b, d: dist(a, b) })).sort((x, y) => x.d - y.d).slice(0, k);
    let sw = 0, swr = 0;
    for (const { b, d } of vic) { let w = 1 / (1 + d / 300); if (simile && b.input.tipo !== a.input.tipo) w *= 0.3; if (simile && b.input.stato !== a.input.stato) w *= 0.6; sw += w; swr += w * b.e; }
    E.push(a.e - (sw ? swr / (sw + k0) : 0));
  }
  return E;
}
function perZona(k0) {
  const target = A.filter((a) => a.preciso); const E = [];
  for (const a of target) { const z = A.filter((b) => b !== a && !duplicato(a, b) && b.zona === a.zona).map((b) => b.e); E.push(a.e - (z.length ? (z.length / (z.length + k0)) * mediana(z) : 0)); }
  return E;
}
function stessaVia(k0) {
  const target = A.filter((a) => a.preciso); const E = []; let n = 0;
  const via = (x) => x.indirizzo.replace(/\s*\d.*$/, "").toLowerCase();
  for (const a of target) { const z = A.filter((b) => b !== a && !duplicato(a, b) && via(b) === via(a)).map((b) => b.e); if (z.length) n++; E.push(a.e - (z.length ? (z.length / (z.length + k0)) * mediana(z) : 0)); }
  console.log(`  (stessa via: ${n} annunci hanno almeno un vicino sulla stessa via)`);
  return E;
}
const stampa = (t, E) => console.log(`${t.padEnd(28)} MAD ${pct(mad(E))} · mediano ${pct(mediana(E))} · ±10% ${(E.filter((x) => Math.abs(x) <= Math.log(1.1)).length / E.length * 100).toFixed(0)}%`);
console.log("\nVARIANTI");
for (const k of [3, 5, 8, 12]) for (const k0 of [0.5, 1, 2]) stampa(`knn k=${k} k0=${k0} simile`, knn(k, k0, true));
for (const k0 of [1, 3, 6]) stampa(`per zona k0=${k0}`, perZona(k0));
for (const k0 of [0.5, 1]) stampa(`stessa via k0=${k0}`, stessaVia(k0));
// quanto pesa il lusso
const senzaLusso = A.filter((a) => a.preciso && a.input.tipo !== "sig").map((a) => a.e);
stampa("base senza signorile", senzaLusso);
const soloLusso = A.filter((a) => a.preciso && a.input.tipo === "sig").map((a) => a.e);
stampa(`base solo signorile n=${soloLusso.length}`, soloLusso);

console.log("\nSIGNORILE per fascia / stato / zona (tutti gli annunci, anche solo via)");
const g = {};
for (const a of A.filter((x) => x.input.tipo === "sig")) { (g[`fascia ${a.zona[0]}`] ||= []).push(a.e); (g[`stato ${a.input.stato}`] ||= []).push(a.e); (g[`zona ${a.zona}`] ||= []).push(a.e); (g[`mq ${a.mq < 80 ? "<80" : a.mq < 150 ? "80-150" : ">=150"}`] ||= []).push(a.e); }
for (const k of Object.keys(g).sort()) console.log(`  ${k.padEnd(14)} n=${String(g[k].length).padStart(2)}  mediano ${pct(mediana(g[k]))}  MAD ${pct(mad(g[k]))}`);
console.log("\nCIVILE per fascia");
const h = {};
for (const a of A.filter((x) => x.input.tipo === "civ")) (h[`fascia ${a.zona[0]}`] ||= []).push(a.e);
for (const k of Object.keys(h).sort()) console.log(`  ${k.padEnd(14)} n=${String(h[k].length).padStart(2)}  mediano ${pct(mediana(h[k]))}  MAD ${pct(mad(h[k]))}`);
