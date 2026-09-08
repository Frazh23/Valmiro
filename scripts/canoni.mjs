/**
 * Quanto il modello degli affitti somiglia ai canoni chiesti davvero.
 *
 *   npm run canoni                                  → tutti i lotti di affitti
 *   npm run canoni data/annunci/2026-09-08-affitti-idealista.csv
 *
 * Perche' serve. La stima di vendita ha un errore misurato e pubblicato. Il
 * canone no: `canoneBase` parte dai canoni OMI e applica lo stesso premio
 * compresso dello stato tarato **sulle vendite**, prestato agli affitti perche'
 * «non c'e' motivo di credere che facciano diversamente». E' un'ipotesi
 * ragionevole, mai verificata contro un solo annuncio. Questo comando la
 * verifica.
 *
 * Che cosa confronta: il canone mensile chiesto nell'annuncio contro il canone
 * che il motore calcola per quella casa. In colonna `prezzo_richiesto` degli
 * annunci di affitto c'e' il canone mensile (convenzione di data/annunci).
 *
 * Che cosa NON fa: non cambia niente. Come `calibra`, propone e basta. E i
 * canoni chiesti non sono canoni firmati: fra i due c'e' una trattativa che
 * qui non si vede.
 */

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { RADICE, caricaAnnunci, inputDaRiga } from "./annunci.mjs";

const BUILD = join(RADICE, ".build-canoni");
execSync(
  `npx tsc src/lib/engine.ts src/lib/affitto.ts src/lib/indirizzario.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`,
  { cwd: RADICE, stdio: "inherit" },
);
const require = createRequire(import.meta.url);
const motore = require(join(BUILD, "src/lib/engine.js"));
const affitto = require(join(BUILD, "src/lib/affitto.js"));
const indirizzario = require(join(BUILD, "src/lib/indirizzario.js"));

const archivio = caricaAnnunci(process.argv[2], { mercato: "affitto" });
console.log(`lotti di affitti: ${archivio.lotti.join(", ") || "nessuno"} · ${archivio.annunci.length} annunci`);

if (!archivio.annunci.length) {
  console.log(`\nNon c'e' ancora nessun lotto di affitti. Si raccoglie con:`);
  console.log(`  npm run idealista -- --affitti     (serve la chiave API)`);
  console.log(`Il file deve avere «affitti» nel nome: e' cosi' che l'archivio tiene i due mercati separati.\n`);
  process.exit(0);
}

const misure = [];
let senzaZona = 0, senzaCanone = 0;
for (const r of archivio.annunci) {
  let zona = r.zona;
  if (!zona && r.indirizzo) {
    const ris = indirizzario.risolvi(r.indirizzo);
    zona = ris.esito === "civico" ? ris.zona : ris.esito === "via" ? ris.via.zona : "";
  }
  if (!zona) { senzaZona++; continue; }
  let input;
  try { motore.scala(zona, "civ"); input = inputDaRiga(r, zona); } catch { senzaZona++; continue; }
  const base = affitto.canoneBase(zona, input.tipo, input.stato);
  if (!base) { senzaCanone++; continue; }
  const chiesto = Number(r.prezzo_richiesto);
  const nostro = base.euroMqMese * input.mq;
  if (!(chiesto > 0) || !(nostro > 0)) { senzaCanone++; continue; }
  misure.push({
    id: r.id, zona, fascia: zona[0], stato: input.stato, mq: input.mq,
    chiesto, nostro, chiestoMq: chiesto / input.mq,
    e: Math.log(chiesto / nostro),
    ripiego: base.ripiego,
  });
}

if (senzaZona || senzaCanone) console.log(`scartati: ${senzaZona} senza zona utilizzabile, ${senzaCanone} senza canone OMI`);
if (misure.length < 20) {
  console.error(`\nSolo ${misure.length} annunci misurabili: ne servono almeno 20 perche' una mediana voglia dire qualcosa.\n`);
  process.exit(1);
}

const mediana = (v) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mad = (v) => { const m = mediana(v); return mediana(v.map((x) => Math.abs(x - m))); };
const pct = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;

function riassunto(titolo, M) {
  if (M.length < 3) return;
  const e = M.map((x) => x.e);
  const dentro10 = M.filter((x) => Math.abs(x.e) <= Math.log(1.1)).length / M.length;
  console.log(`  ${titolo.padEnd(12)} n=${String(M.length).padStart(4)}  scarto mediano ${pct(mediana(e)).padStart(7)}  dispersione ${pct(mad(e)).padStart(6)}  entro ±10%: ${(dentro10 * 100).toFixed(0)}%`);
}

console.log(`\nQUANTO SBAGLIAMO SUI CANONI  (scarto = quanto il canone chiesto supera il nostro)`);
riassunto("tutti", misure);
console.log(`\nPER FASCIA`);
for (const f of ["B", "C", "D", "E"]) riassunto(f, misure.filter((x) => x.fascia === f));
console.log(`\nPER STATO`);
for (const s of ["rist", "abit", "otti", "nuov"]) riassunto(s, misure.filter((x) => x.stato === s));
console.log(`\nPER TAGLIA`);
riassunto("fino a 50 mq", misure.filter((x) => x.mq <= 50));
riassunto("51-90 mq", misure.filter((x) => x.mq > 50 && x.mq <= 90));
riassunto("oltre 90 mq", misure.filter((x) => x.mq > 90));

const ripiego = misure.filter((x) => x.ripiego).length;
if (ripiego) console.log(`\n${ripiego} annunci su ${misure.length} usano il ripiego «civile»: la loro tipologia non e' quotata in quella zona.`);

console.log(`\nI PIU' LONTANI  (di solito e' il dato, non il modello: spese incluse, arredato, posto letto)`);
for (const x of [...misure].sort((a, b) => Math.abs(b.e) - Math.abs(a.e)).slice(0, 8)) {
  console.log(`  ${String(x.id).padEnd(10)} ${x.zona} ${x.stato} ${String(x.mq).padStart(4)} mq  chiesto ${Math.round(x.chiesto)} €/mese  nostro ${Math.round(x.nostro)}  ${pct(x.e)}`);
}

console.log(`\nCOME LEGGERLO`);
console.log(`  Uno scarto mediano vicino a zero vuol dire che il modello centra il mercato degli`);
console.log(`  annunci; la dispersione dice quanto e' largo il bersaglio. Ma i canoni chiesti non`);
console.log(`  sono canoni firmati, e negli annunci finiscono arredato, spese incluse e posti letto`);
console.log(`  che il modello non distingue: prima di toccare un parametro, rileggere i piu' lontani.`);
console.log(`  Nessun coefficiente si cambia guardando questi numeri senza un commit che lo spieghi.\n`);
