/**
 * Calibrazione del motore sugli annunci reali.
 *
 *   npm run calibra
 *
 * Legge data/calibrazione/annunci.csv, passa ogni annuncio nel motore vero
 * (compilato al volo da src/lib, nessuna copia della logica) e confronta il
 * prezzo che il motore suggerirebbe di chiedere con quello chiesto davvero.
 * Poi prova a muovere i due parametri esposti dal motore — compressioneStato
 * e livello — e dice quali valori avvicinano di piu' le stime agli annunci.
 *
 * Non scrive nulla nel codice: propone. Cambiare un parametro e' un commit.
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSV = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(RADICE, "data/calibrazione/annunci.csv");
const BUILD = join(RADICE, ".calibrazione/build");

// ---------------------------------------------------------------- motore

/* Il motore e' TypeScript e questo script gira in Node puro: lo si compila in
   una cartella temporanea (ignorata da git) e lo si carica da li'. Cosi' la
   calibrazione usa esattamente il codice che usa il sito. */
console.log("compilo il motore…");
execSync(
  `npx tsc src/lib/engine.ts src/lib/indirizzario.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`,
  { cwd: RADICE, stdio: "inherit" }
);
const require = createRequire(import.meta.url);
const motore = require(join(BUILD, "src/lib/engine.js"));
const indirizzario = require(join(BUILD, "src/lib/indirizzario.js"));

// ---------------------------------------------------------------- lettura

if (!existsSync(CSV)) { console.error(`manca ${CSV}`); process.exit(1); }
const righe = readFileSync(CSV, "utf8").split(/\r?\n/).filter((r) => r.trim());
const testata = righe.shift().split(";").map((s) => s.trim());
const colonna = (r, nome) => (r[testata.indexOf(nome)] ?? "").trim();
const siNo = (v) => /^(si|sì|s|true|1|x)$/i.test(v);
const oNull = (v) => (v ? v : null);

const annunci = [];
const scartati = [];
for (const riga of righe) {
  const r = riga.split(";");
  const id = colonna(r, "id");
  const indirizzo = colonna(r, "indirizzo");
  let zona = colonna(r, "zona");
  if (!zona && indirizzo) {
    const ris = indirizzario.risolvi(indirizzo);
    zona = ris.esito === "civico" ? ris.zona : ris.esito === "via" ? ris.via.zona : "";
  }
  const mq = Number(colonna(r, "mq"));
  const prezzo = Number(colonna(r, "prezzo_richiesto"));
  const venduto = Number(colonna(r, "prezzo_venduto")) || null;
  if (!zona || !(mq > 0) || !(prezzo > 0)) { scartati.push({ id, motivo: !zona ? "zona non risolta" : "mq o prezzo mancanti" }); continue; }
  annunci.push({
    id, zona, prezzo, venduto, fonte: colonna(r, "fonte"),
    input: {
      zona, tipo: colonna(r, "tipo") || "civ", mq,
      stato: colonna(r, "stato") || "abit",
      piano: colonna(r, "piano") || "1-2",
      ascensore: siNo(colonna(r, "ascensore")),
      classe: (colonna(r, "classe") || "D").toUpperCase()[0],
      balconi: Number(colonna(r, "balconi")) || 0,
      cantina: siNo(colonna(r, "cantina")),
      box: colonna(r, "box") || "nessuno",
      epoca: oNull(colonna(r, "epoca")),
      affaccio: oNull(colonna(r, "affaccio")),
      metro: oNull(colonna(r, "metro")),
    },
  });
}

for (const s of scartati) console.log(`  scartato ${s.id}: ${s.motivo}`);
if (annunci.length < 20) {
  console.error(`\nSolo ${annunci.length} annunci utilizzabili: ne servono almeno 20, meglio 40-50.`);
  console.error("Non ha senso tarare un modello su un campione cosi' piccolo: ogni annuncio strano peserebbe troppo.");
  process.exit(1);
}

// ---------------------------------------------------------------- misure

/** errore in log: simmetrico, +0.10 e -0.10 pesano uguale, e si somma bene */
function errori() {
  return annunci.map((a) => {
    const s = motore.stima(a.input);
    const riferimento = a.venduto ? s.centro : s.pubblica;
    const reale = a.venduto || a.prezzo;
    return { ...a, stima: riferimento, e: Math.log(reale / riferimento) };
  });
}
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const mad = (v) => { const m = mediana(v); return mediana(v.map((x) => Math.abs(x - m))); };
const pct = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;

function riassunto(titolo, E) {
  const e = E.map((x) => x.e);
  const dentro10 = E.filter((x) => Math.abs(x.e) <= Math.log(1.10)).length / E.length;
  console.log(`\n${titolo}`);
  console.log(`  annunci ${E.length} · errore mediano ${pct(mediana(e))} · dispersione (MAD) ${pct(mad(e))} · entro ±10%: ${(dentro10 * 100).toFixed(0)}%`);
}

const E0 = errori();
riassunto("COM'E' OGGI  (errore = quanto il prezzo reale supera la stima)", E0);

const perGruppo = (chiave) => {
  const g = {};
  for (const x of E0) (g[chiave(x)] ||= []).push(x.e);
  for (const k of Object.keys(g).sort()) console.log(`    ${k.padEnd(10)} n=${String(g[k].length).padStart(2)}  mediano ${pct(mediana(g[k]))}`);
};
console.log("  per stato:");   perGruppo((x) => x.input.stato);
console.log("  per fascia:");  perGruppo((x) => x.zona[0]);

// ---------------------------------------------------------------- taratura

const P = motore.PARAMETRI;
const originali = { ...P };

/* Primo: il livello. Se il mercato chiede sistematicamente piu' (o meno) di
   quanto l'OMI aggiornato dice, l'errore mediano non e' zero. Il livello che lo
   azzera e' exp(mediana). */
P.livello = originali.livello * Math.exp(mediana(E0.map((x) => x.e)));
const E1 = errori();
riassunto(`CON livello = ${P.livello.toFixed(3)}  (azzera l'errore mediano)`, E1);

/* Secondo: la compressione dello stato. Il valore giusto e' quello per cui gli
   annunci "da sistemare" e quelli "in ordine" sbagliano nella stessa direzione:
   se ristrutturati e nuovi risultano sottostimati rispetto agli abitabili, il
   premio e' troppo compresso; se sovrastimati, troppo poco. */
const bassi = (E) => E.filter((x) => ["rist", "abit"].includes(x.input.stato)).map((x) => x.e);
const alti = (E) => E.filter((x) => ["otti", "nuov"].includes(x.input.stato)).map((x) => x.e);
if (alti(E1).length >= 6 && bassi(E1).length >= 6) {
  let migliore = { c: originali.compressioneStato, gap: Infinity, mad: Infinity };
  for (let c = 0; c <= 1.0001; c += 0.05) {
    P.compressioneStato = c;
    P.livello = originali.livello;
    const Ec = errori();
    P.livello = originali.livello * Math.exp(mediana(Ec.map((x) => x.e)));
    const E = errori();
    const gap = Math.abs(mediana(alti(E)) - mediana(bassi(E)));
    const disp = mad(E.map((x) => x.e));
    if (gap < migliore.gap - 1e-9 || (Math.abs(gap - migliore.gap) < 1e-9 && disp < migliore.mad)) migliore = { c, gap, mad: disp, livello: P.livello };
  }
  P.compressioneStato = migliore.c; P.livello = migliore.livello;
  const E2 = errori();
  riassunto(`CON compressioneStato = ${migliore.c.toFixed(2)} e livello = ${migliore.livello.toFixed(3)}`, E2);
  console.log(`  scarto fra stati in ordine e da sistemare: ${pct(mediana(alti(E2)) - mediana(bassi(E2)))} (oggi ${pct(mediana(alti(E0)) - mediana(bassi(E0)))})`);
} else {
  console.log("\nTroppo pochi annunci per stato (servono almeno 6 'rist/abit' e 6 'otti/nuov') per tarare compressioneStato.");
}

// ---------------------------------------------------------------- outlier

console.log("\nGLI ANNUNCI PIU' LONTANI DALLA STIMA (da rileggere: spesso e' il dato, non il modello)");
for (const x of [...errori()].sort((a, b) => Math.abs(b.e) - Math.abs(a.e)).slice(0, 6))
  console.log(`  ${x.id.padEnd(10)} ${x.zona} ${x.input.stato} ${String(x.input.mq).padStart(4)} mq  chiesto ${x.prezzo.toLocaleString("it-IT")}  stima ${x.stima.toLocaleString("it-IT")}  ${pct(x.e)}`);

console.log("\nQuesti sono suggerimenti. Se convincono, si cambiano i default in src/lib/engine.ts con un commit che spiega perche'.");
