/**
 * Rileggere gli stessi annunci, ogni due settimane, sempre nelle stesse aree.
 *
 *   npm run riletture
 *
 * E' la raccolta che costruisce l'unico dato che non si puo' comprare senza
 * affittarlo: come cambia il prezzo chiesto prima che una casa esca dal mercato.
 * Ogni passaggio scrive un file in `data/annunci/riletture/`, e
 * `npm run storie` ricompone le vite.
 *
 * DUE REGOLE, e non sono dettagli tecnici.
 *
 * 1. **Le aree non si cambiano.** Sono congelate qui sotto. Un annuncio conta
 *    come «sparito» perche' non lo rivediamo dove lo vedevamo prima: se al
 *    passaggio successivo guardiamo altrove, ogni annuncio risulta sparito e le
 *    statistiche diventano spazzatura. Aggiungere un'area nuova si puo' (comincia
 *    la sua serie da zero); spostare o togliere un'area esistente no.
 *
 * 2. **Profondita', non ampiezza.** Con cinquanta annunci a chiamata, spargersi
 *    su tutta Milano vuol dire non rivedere quasi mai lo stesso annuncio: si
 *    raccolgono fotografie diverse ogni volta. Meglio poche aree piccole coperte
 *    per intero: li' dentro le storie si chiudono davvero. La taratura vuole
 *    varieta' (`npm run idealista`), le storie vogliono costanza. Sono due
 *    raccolte diverse e restano due file diversi.
 *
 * Il piano gratuito di Idealista concede un centinaio di richieste al mese:
 * quattro aree per due pagine sono otto richieste a passaggio, due passaggi al
 * mese sedici. Sta comodamente dentro.
 *
 * Le chiavi stanno in .env.local (IDEALISTA_KEY, IDEALISTA_SECRET) e non passano
 * mai per la chat.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------------------------------------------- aree congelate
   Centro e raggio in metri. Scelte il 8 settembre 2026 per coprire quattro
   mercati diversi: centro storico, semicentro residenziale, semicentro
   popolare, periferia. Non si toccano: vedi regola 1. */
const AREE = [
  { nome: "brera",        centro: "45.4720,9.1870", raggio: 900,  fascia: "B" },
  { nome: "buenosaires",  centro: "45.4790,9.2100", raggio: 1100, fascia: "C" },
  { nome: "solari",       centro: "45.4560,9.1600", raggio: 1100, fascia: "C" },
  { nome: "bicocca",      centro: "45.5150,9.2100", raggio: 1300, fascia: "D" },
];
const PAGINE = 2;

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
  console.error("Mancano IDEALISTA_KEY e IDEALISTA_SECRET in .env.local (richiesta su developers.idealista.com).");
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

/* Ordine `price asc`, non `publicationDate desc`: con la data di pubblicazione
   ogni passaggio pescherebbe soprattutto annunci nuovi, che e' l'opposto di
   quello che serve. Un ordinamento stabile fa rivedere gli stessi. */
async function cerca(tok, area, pagina) {
  const p = new URLSearchParams({
    center: area.centro, distance: String(area.raggio), country: "it", locale: "it",
    operation: "sale", propertyType: "homes", maxItems: "50", numPage: String(pagina),
    order: "price", sort: "asc",
  });
  const r = await fetch("https://api.idealista.com/3.5/it/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: p.toString(),
  });
  if (!r.ok) throw new Error(`search ${area.nome} p${pagina}: ${r.status} ${await r.text()}`);
  return (await r.json()).elementList || [];
}

function stato(x) {
  if (x.newDevelopment || x.status === "newdevelopment") return "nuov";
  if (x.status === "renew") return "rist";
  if (/ristrutturat|rinnovat/i.test(x.description || "")) return "otti";
  return "abit";
}

// ------------------------------------------------------------ esecuzione
const oggi = new Date().toISOString().slice(0, 10);
const dir = join(RADICE, "data/annunci/riletture");
mkdirSync(dir, { recursive: true });
const out = join(dir, `${oggi}.csv`);
if (existsSync(out)) {
  console.error(`${out} esiste gia': oggi la raccolta e' gia' girata. Due passaggi nello stesso giorno non aggiungono storia.`);
  process.exit(1);
}

const tok = await token();
const righe = ["rif;fonte;data;prezzo;zona;stato;mq;area;pubblicato"];
const visti = new Set();
let fuori = 0;

for (const area of AREE) {
  let presi = 0;
  for (let pagina = 1; pagina <= PAGINE; pagina++) {
    const lista = await cerca(tok, area, pagina);
    if (!lista.length) break;
    for (const x of lista) {
      if (visti.has(x.propertyCode)) continue;
      visti.add(x.propertyCode);
      if (x.municipality && !/^milano$/i.test(x.municipality)) { fuori++; continue; }
      const zona = zonaDelPunto(x.longitude, x.latitude);
      if (!zona) { fuori++; continue; }
      if (!(x.size > 20) || !(x.price > 50000)) continue;
      righe.push([
        String(x.propertyCode), "idealista", oggi, Math.round(x.price), zona, stato(x),
        Math.round(x.size), area.nome, (x.publicationDate || "").toString().slice(0, 10),
      ].join(";"));
      presi++;
    }
  }
  console.log(`${area.nome}: ${presi} annunci`);
}

writeFileSync(out, righe.join("\n"), { flag: "wx" });
console.log(`\n${righe.length - 1} letture scritte in ${out} (${fuori} fuori Milano o senza zona OMI)`);
console.log(`Poi: npm run storie  — con un passaggio solo dira' che non c'e' ancora niente da misurare, ed e' giusto cosi'.`);
console.log(`Il prossimo passaggio fra due settimane, sulle stesse aree. Non cambiarle.`);
