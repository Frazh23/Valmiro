/**
 * Verifica del motore su un campione indipendente.
 *
 *   npm run verifica -- --congela      fissa modello e parametri, prima di guardare i dati
 *   npm run verifica                   misura il motore sui soli lotti di verifica
 *
 * Il protocollo e' in docs/verifica.md. In breve, questo script fa rispettare tre regole:
 *
 * 1. Taratura e verifica sono lotti diversi. Un lotto e' di verifica se il suo nome
 *    contiene «-verifica» (es. 2026-10-01-idealista-verifica.csv). Tutti gli altri sono
 *    di taratura. Prima di misurare si tolgono dal campione di verifica gli annunci che
 *    sono la stessa casa di un annuncio di taratura: stesso identificativo del portale
 *    (colonna `rif`, fonte + riferimento), oppure stesso indirizzo con metri entro il 3%
 *    e prezzo entro il 2%. Quel filtro e' un primo passaggio, non una garanzia: la stessa
 *    casa puo' tornare con prezzo ribassato o metri diversi. Per questo il rapporto elenca
 *    anche i «possibili duplicati da rivedere a mano» (stesso indirizzo, metri entro il 10%
 *    o prezzo entro il 10%) e tiene separati gli «immobili diversi nello stesso stabile»
 *    (stesso indirizzo, metri lontani): quelli restano nel campione, e si vede quanti sono.
 * 2. Il modello si fissa prima. `--congela` scrive in data/annunci/parametri-congelati.json
 *    i parametri e i coefficienti del motore con un'impronta. La misura rifiuta di partire
 *    se l'impronta attuale e' diversa: significa che qualcuno ha toccato il motore dopo
 *    aver visto la verifica, e i numeri non sarebbero piu' fuori campione.
 * 3. Il campione di verifica non tara niente: qui non c'e' nessuna ricerca di parametri.
 *    Per quella c'e' scripts/calibra.mjs, che gira sui soli lotti di taratura.
 *
 * La metrica riguarda i prezzi richiesti finche' la colonna prezzo_venduto e' vuota; se
 * un giorno sara' piena, la variabile di confronto diventa il valore centrale e il
 * rapporto lo dice. Il rapporto si scrive in docs/verifiche/AAAA-MM-GG.md con dimensione,
 * copertura, date e metriche: e' quello che la pagina puo' citare al posto dei numeri di
 * taratura.
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { RADICE, ARCHIVIO, caricaAnnunci, chiaveAnnuncio, inputDaRiga } from "./annunci.mjs";

const CONGELA = process.argv.includes("--congela");
const BUILD = join(RADICE, ".calibrazione/build");
const CONGELATI = join(ARCHIVIO, "parametri-congelati.json");

// ---------------------------------------------------------------- motore

console.log("compilo il motore…");
execSync(
  `npx tsc src/lib/engine.ts src/lib/indirizzario.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`,
  { cwd: RADICE, stdio: "inherit" }
);
const require = createRequire(import.meta.url);
const motore = require(join(BUILD, "src/lib/engine.js"));
const indirizzario = require(join(BUILD, "src/lib/indirizzario.js"));
const dati = require(join(BUILD, "src/lib/data.js"));

/** Tutto cio' che decide un numero del motore, in un'impronta: parametri, coefficienti, semestre, indice. */
function impronta() {
  const testo = JSON.stringify({
    PARAMETRI: motore.PARAMETRI, COEFF: motore.COEFF, COMPRESSIONE_STATO: motore.COMPRESSIONE_STATO,
    SEMESTRE: dati.SEMESTRE, INDICE_ISTAT: dati.INDICE_ISTAT,
  });
  return { hash: createHash("sha256").update(testo).digest("hex").slice(0, 16), testo: JSON.parse(testo) };
}
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: RADICE }).toString().trim(); } catch { return "n.d."; } })();

// ---------------------------------------------------------------- congelamento

if (CONGELA) {
  const { hash, testo } = impronta();
  writeFileSync(CONGELATI, JSON.stringify({ data: new Date().toISOString().slice(0, 10), commit, hash, ...testo }, null, 2) + "\n");
  console.log(`\nModello congelato: impronta ${hash}, commit ${commit}, scritto in ${CONGELATI}.`);
  console.log("Da qui in avanti i lotti «-verifica» si misurano soltanto. Se il motore cambia, si ricongela e la verifica riparte con dati nuovi.");
  process.exit(0);
}

if (!existsSync(CONGELATI)) {
  console.error("\nNessun modello congelato. Prima di guardare il campione di verifica: npm run verifica -- --congela");
  process.exit(1);
}
const congelato = JSON.parse(readFileSync(CONGELATI, "utf8"));
const attuale = impronta();
if (congelato.hash !== attuale.hash) {
  console.error(`\nIl motore e' cambiato dopo il congelamento (impronta ${congelato.hash} del ${congelato.data}, ora ${attuale.hash}).`);
  console.error("Una verifica su un modello ritoccato dopo aver visto i dati non e' fuori campione. Due strade oneste:");
  console.error("  - tornare ai parametri congelati e misurare;");
  console.error("  - ricongelare (npm run verifica -- --congela) e raccogliere un lotto di verifica NUOVO.");
  process.exit(1);
}

// ---------------------------------------------------------------- lotti

/* I lotti si caricano separatamente per ruolo. caricaAnnunci() toglie i duplicati esatti
   tenendo la lettura piu' recente: caricando tutto insieme, una casa presente in taratura
   e ricomparsa in verifica resterebbe in verifica e sparirebbe dalla taratura, cioe' il
   contrario di quello che serve. Qui la taratura si carica per prima e intera, e la verifica
   si pulisce contro di lei. */
const file = readdirSync(ARCHIVIO).filter((f) => f.endsWith(".csv")).sort();
const diVerifica = (f) => /-verifica/.test(f);
const taratura = [];
{ const visti = new Set(); for (const f of file.filter((f) => !diVerifica(f))) for (const r of caricaAnnunci(join(ARCHIVIO, f)).annunci) { const k = chiaveAnnuncio(r); if (!visti.has(k)) { visti.add(k); taratura.push(r); } } }
const verificaGrezza = file.filter(diVerifica).flatMap((f) => caricaAnnunci(join(ARCHIVIO, f)).annunci);
console.log(`lotti: ${file.join(", ")}`);
console.log(`taratura ${taratura.length} annunci · verifica ${verificaGrezza.length} annunci (prima della pulizia)`);
if (!verificaGrezza.length) {
  console.error("\nNessun lotto di verifica: i file di verifica hanno «-verifica» nel nome, es. data/annunci/2026-10-01-idealista-verifica.csv");
  process.exit(1);
}

/** Identita' e somiglianza fra annunci. Tre livelli, dal certo al dubbio. */
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(via|viale|piazza|piazzale|corso|largo|v\.le|p\.zza|c\.so)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const stessoIndirizzo = (a, b) => !!a.indirizzo && !!b.indirizzo && norm(a.indirizzo) === norm(b.indirizzo);
const scarto = (a, b, campo) => Math.abs(Number(a[campo]) - Number(b[campo])) / Number(b[campo]);
/** stesso identificativo sul portale: fonte + riferimento (colonna `rif`, facoltativa) */
const stessoRif = (a, b) => !!a.rif && !!b.rif && a.fonte === b.fonte && String(a.rif).trim() === String(b.rif).trim();
/** stessa casa, con buona sicurezza: stesso rif, oppure stesso indirizzo con metri entro il 3% e prezzo entro il 2% */
const stessaCasa = (a, b) => stessoRif(a, b) || (stessoIndirizzo(a, b) && scarto(a, b, "mq") <= 0.03 && scarto(a, b, "prezzo_richiesto") <= 0.02);
/** forse la stessa casa, ribassata o rimisurata: stesso indirizzo e metri entro il 10% o prezzo entro il 10% */
const forseStessaCasa = (a, b) => !stessaCasa(a, b) && stessoIndirizzo(a, b) && (scarto(a, b, "mq") <= 0.10 || scarto(a, b, "prezzo_richiesto") <= 0.10);
/** un altro appartamento nello stesso palazzo: stesso indirizzo, metri lontani */
const stessoStabile = (a, b) => stessoIndirizzo(a, b) && scarto(a, b, "mq") > 0.10;

const esclusi = { taratura: 0, interni: 0, perRif: 0 };
const daRivedere = [];   // possibili duplicati tenuti nel campione, da controllare a mano
const stessoPalazzo = new Set();
const verifica = [];
for (const r of verificaGrezza) {
  const t = taratura.find((x) => stessaCasa(r, x));
  if (t) { esclusi.taratura++; if (stessoRif(r, t)) esclusi.perRif++; continue; }
  if (verifica.some((v) => stessaCasa(r, v))) { esclusi.interni++; continue; }
  const dubbio = taratura.find((x) => forseStessaCasa(r, x)) || verifica.find((v) => forseStessaCasa(r, v));
  if (dubbio) daRivedere.push({ r, con: dubbio });
  if (taratura.some((x) => stessoStabile(r, x)) || verifica.some((v) => stessoStabile(r, v))) stessoPalazzo.add(r.id);
  verifica.push(r);
}
console.log(`tolti ${esclusi.taratura} annunci gia' presenti in taratura (${esclusi.perRif} per identificativo, gli altri per indirizzo, metri e prezzo) e ${esclusi.interni} ripubblicazioni interne al lotto`);
console.log(`${daRivedere.length} possibili duplicati da rivedere a mano (tenuti nel campione) · ${stessoPalazzo.size} immobili con un altro appartamento dello stesso stabile nell'archivio (tenuti: sono case diverse)`);

// ---------------------------------------------------------------- misura

const usati = [], scartati = [];
for (const r of verifica) {
  let zona = r.zona;
  if (!zona && r.indirizzo) {
    const ris = indirizzario.risolvi(r.indirizzo);
    zona = ris.esito === "civico" ? ris.zona : ris.esito === "via" ? ris.via.zona : "";
  }
  if (!zona) { scartati.push({ id: r.id, motivo: "zona non risolta" }); continue; }
  try { motore.scala(zona, "civ"); } catch { scartati.push({ id: r.id, motivo: `zona ${zona} non quotata` }); continue; }
  const venduto = Number(r.prezzo_venduto) || null;
  const s = motore.stima(inputDaRiga(r, zona));
  const riferimento = venduto ? s.centro : s.pubblica;
  usati.push({ ...r, zona, venduto, e: Math.log((venduto || Number(r.prezzo_richiesto)) / riferimento), stimaRif: riferimento });
}
for (const s of scartati) console.log(`  scartato ${s.id}: ${s.motivo}`);

const mediana = (v) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
const mad = (v) => { const m = mediana(v); return mediana(v.map((x) => Math.abs(x - m))); };
const pct = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
const dentro10 = (E) => E.filter((x) => Math.abs(x.e) <= Math.log(1.10)).length / E.length;
const conVenduto = usati.filter((x) => x.venduto).length;
const variabile = conVenduto === usati.length && usati.length ? "prezzo di compravendita contro valore centrale"
  : conVenduto ? `MISTA: ${conVenduto} con prezzo venduto, ${usati.length - conVenduto} con prezzo richiesto — da separare prima di citare`
  : "prezzo richiesto contro prezzo di pubblicazione stimato (nessun prezzo di compravendita disponibile)";

const gruppi = (chiave) => {
  const g = {};
  for (const x of usati) (g[chiave(x)] ||= []).push(x);
  return Object.keys(g).sort().map((k) => `| ${k} | ${g[k].length} | ${pct(mediana(g[k].map((x) => x.e)))} | ${pct(mad(g[k].map((x) => x.e)))} | ${(dentro10(g[k]) * 100).toFixed(0)}% |`);
};
const date = usati.map((x) => x.data).filter(Boolean).sort();
const oggi = new Date().toISOString().slice(0, 10);

const rapporto = `# Verifica indipendente del motore — ${oggi}

Protocollo: docs/verifica.md. Modello congelato il ${congelato.data} (commit ${congelato.commit}, impronta ${congelato.hash}); impronta al momento della misura: ${attuale.hash} (uguale). Commit della misura: ${commit}.

**Variabile di confronto: ${variabile}.** ${conVenduto ? "" : "Questi numeri dicono quanto le stime somigliano a cio' che i venditori chiedono, non a cio' che gli acquirenti pagano."}

## Campione

- lotti di verifica: ${[...new Set(verifica.map((r) => r.lotto))].join(", ")}
- annunci nei lotti: ${verificaGrezza.length}; esclusi perche' gia' in taratura (stessa casa, anche ripubblicata): ${esclusi.taratura} (${esclusi.perRif} riconosciuti dall'identificativo del portale); ripubblicazioni interne: ${esclusi.interni}; senza zona o zona non quotata: ${scartati.length}
- **possibili duplicati da rivedere a mano** (stesso indirizzo, metri o prezzo entro il 10%, tenuti nel campione): ${daRivedere.length}${daRivedere.length ? "\n" + daRivedere.map(({ r, con }) => `  - ${r.id} (${r.indirizzo}, ${r.mq} mq, ${Number(r.prezzo_richiesto).toLocaleString("it-IT")} €) ~ ${con.id} in ${con.lotto} (${con.mq} mq, ${Number(con.prezzo_richiesto).toLocaleString("it-IT")} €)`).join("\n") : ""}
- immobili diversi nello stesso stabile di un altro annuncio (stesso indirizzo, metri lontani): ${stessoPalazzo.size}, tenuti nel campione come case distinte
- il filtro indirizzo/metri/prezzo e' un primo passaggio, non una garanzia: prima di citare il rapporto, i possibili duplicati vanno riletti; se uno e' la stessa casa si toglie e si rilancia
- **annunci misurati: ${usati.length}**
- date degli annunci: ${date.length ? `${date[0]} – ${date[date.length - 1]}` : "non indicate"}
- quotazioni OMI ${dati.SEMESTRE}, indice Istat ${dati.INDICE_ISTAT}
- lotti di taratura tenuti separati: ${[...new Set(taratura.map((r) => r.lotto))].join(", ") || "nessuno"} (${taratura.length} annunci)

## Metriche

| Taglio | n | scarto mediano | MAD | entro ±10% |
|---|---|---|---|---|
| Tutti | ${usati.length} | ${pct(mediana(usati.map((x) => x.e)))} | ${pct(mad(usati.map((x) => x.e)))} | ${(dentro10(usati) * 100).toFixed(0)}% |
${gruppi((x) => `fascia ${x.zona[0]}`).join("\n")}
${gruppi((x) => `stato ${x.stato || "abit"}`).join("\n")}
${gruppi((x) => `tipo ${x.tipo || "civ"}`).join("\n")}

Lo scarto e' ln(prezzo reale / stima di riferimento): positivo quando il mercato chiede piu' di quanto il motore stima.

## Cosa non si fa con questi numeri

Non si scelgono coefficienti. Se la verifica dice che il motore sbaglia in modo sistematico, la strada e' tornare a tarare sui lotti di taratura (npm run calibra), ricongelare e raccogliere un nuovo lotto di verifica. ${usati.length < 40 ? `**Con ${usati.length} annunci il campione e' piccolo: le metriche per gruppo sono indicative.**` : ""}
`;

mkdirSync(join(RADICE, "docs/verifiche"), { recursive: true });
const uscita = join(RADICE, `docs/verifiche/${oggi}.md`);
writeFileSync(uscita, rapporto);
console.log(`\n${rapporto}`);
console.log(`rapporto scritto in ${uscita}`);
