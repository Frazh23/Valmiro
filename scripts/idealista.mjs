/**
 * Annunci di Milano dall'API ufficiale di Idealista, nel formato di
 * data/calibrazione/annunci.csv.
 *
 *   npm run idealista            → data/calibrazione/idealista-AAAA-MM-GG.csv
 *   npm run calibra data/calibrazione/idealista-AAAA-MM-GG.csv
 *
 * Serve una chiave: ci si registra su https://developers.idealista.com, si
 * ottengono apikey e secret e si mettono in .env.local come
 *   IDEALISTA_KEY=…
 *   IDEALISTA_SECRET=…
 * Il piano gratuito concede circa 100 richieste al mese: questo script ne fa
 * tre (centro, nord, sud) da 50 annunci l'una, una volta. E' l'unico modo
 * lecito di prendere annunci in automatico: i portali vietano lo scraping e le
 * loro banche dati sono protette, e Valmiro non li tocca.
 *
 * Le chiavi non passano mai per la chat: le legge questo script da .env.local
 * e non le stampa.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");

// ------------------------------------------------------------ credenziali
const env = {};
const envFile = join(RADICE, ".env.local");
if (existsSync(envFile))
  for (const riga of readFileSync(envFile, "utf8").split("\n")) {
    const m = riga.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
const KEY = process.env.IDEALISTA_KEY || env.IDEALISTA_KEY;
const SECRET = process.env.IDEALISTA_SECRET || env.IDEALISTA_SECRET;
if (!KEY || !SECRET) {
  console.error("Mancano IDEALISTA_KEY e IDEALISTA_SECRET in .env.local (registrazione su developers.idealista.com).");
  process.exit(1);
}

// ------------------------------------------------------------ zona dal punto
const BUILD = join(RADICE, ".calibrazione/build");
execSync(`npx tsc src/lib/geo.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`, { cwd: RADICE, stdio: "inherit" });
const { zonaDelPunto } = createRequire(import.meta.url)(join(BUILD, "src/lib/geo.js"));

// ------------------------------------------------------------ API
async function token() {
  const r = await fetch("https://api.idealista.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=read",
  });
  if (!r.ok) throw new Error(`token: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

async function cerca(tok, centro) {
  const p = new URLSearchParams({
    center: centro, distance: "3500", country: "it", locale: "it",
    operation: "sale", propertyType: "homes", maxItems: "50", numPage: "1",
    order: "publicationDate", sort: "desc",
  });
  const r = await fetch("https://api.idealista.com/3.5/it/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: p.toString(),
  });
  if (!r.ok) throw new Error(`search: ${r.status} ${await r.text()}`);
  return (await r.json()).elementList || [];
}

// ------------------------------------------------------------ mappatura
/* Idealista descrive lo stato con tre valori: "renew" (da ristrutturare),
   "good" (buono) e "newdevelopment". Un "good" puo' essere sia abitabile sia
   appena ristrutturato: qui diventa "abit", e gli annunci con "ristrutturato"
   nel testo diventano "otti". E' una lettura, non un dato: le note lo dicono. */
function stato(x) {
  if (x.newDevelopment || x.status === "newdevelopment") return "nuov";
  if (x.status === "renew") return "rist";
  if (/ristrutturat|rinnovat/i.test(x.description || "")) return "otti";
  return "abit";
}
function piano(x) {
  const f = String(x.floor ?? "");
  if (f === "bj" || f === "0") return "terra";
  if (f === "en" || f === "st") return "rialzato";
  const n = parseInt(f, 10);
  if (!Number.isFinite(n)) return "1-2";
  if (x.topFloor) return "ultimo";
  return n <= 2 ? "1-2" : n <= 5 ? "3-5" : "6+";
}
const classe = (x) => (x.energyCertification?.[0] || "").toUpperCase().match(/[A-G]/)?.[0] || "D";

// ------------------------------------------------------------ esecuzione
const CENTRI = { centro: "45.4642,9.1900", nord: "45.5000,9.1800", sud: "45.4350,9.2000" };
const tok = await token();
const righe = ["id;fonte;data;indirizzo;zona;tipo;mq;stato;piano;ascensore;classe;balconi;cantina;box;epoca;affaccio;metro;prezzo_richiesto;prezzo_venduto;note"];
const oggi = new Date().toISOString().slice(0, 10);
const visti = new Set();
let fuori = 0;

for (const [nome, centro] of Object.entries(CENTRI)) {
  const lista = await cerca(tok, centro);
  for (const x of lista) {
    if (visti.has(x.propertyCode)) continue;
    visti.add(x.propertyCode);
    if (x.municipality && !/^milano$/i.test(x.municipality)) { fuori++; continue; }
    const zona = zonaDelPunto(x.longitude, x.latitude);
    if (!zona) { fuori++; continue; }
    if (!(x.size > 20) || !(x.price > 50000)) continue;
    const note = [
      `idealista ${x.propertyCode}`, x.status ? `status=${x.status}` : "", x.floor != null ? `floor=${x.floor}` : "",
      x.rooms ? `${x.rooms} locali` : "", x.hasLift == null ? "ascensore sconosciuto" : "",
    ].filter(Boolean).join(" · ");
    righe.push([
      `ide-${x.propertyCode}`, "idealista", oggi,
      (x.address || "").replace(/;/g, ","), zona, "civ", Math.round(x.size), stato(x), piano(x),
      x.hasLift ? "si" : "no", classe(x), "", "", x.parkingSpace?.hasParkingSpace && x.parkingSpace?.isParkingSpaceIncludedInPrice ? "box" : "nessuno",
      "", "", "", Math.round(x.price), "", note.replace(/;/g, ","),
    ].join(";"));
  }
  console.log(`${nome}: ${lista.length} annunci ricevuti`);
}

const out = join(RADICE, `data/calibrazione/idealista-${oggi}.csv`);
writeFileSync(out, righe.join("\n"));
console.log(`\n${righe.length - 1} annunci di Milano scritti in ${out} (${fuori} fuori Milano o senza zona OMI, scartati)`);
console.log("Rileggili prima di usarli: lo stato 'abit'/'otti' e' dedotto dal testo, il tipo e' sempre 'civ'.");
console.log(`Poi: npm run calibra ${out.replace(RADICE + "/", "")}`);
