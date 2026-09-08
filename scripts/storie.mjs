/**
 * Le storie degli annunci: quanto calano i prezzi prima che una casa esca dal
 * mercato, e quanto tempo ci mette.
 *
 *   npm run storie
 *
 * Legge le riletture (`data/annunci/riletture/*.csv`) piu' i lotti normali, che
 * sono anch'essi letture datate, e ricostruisce per ogni annuncio la sua vita.
 * Il risultato e' l'unica strada che abbiamo verso i prezzi di chiusura: in
 * Italia i prezzi dei rogiti non sono pubblici, ma il prezzo che un venditore
 * chiede *l'ultima volta prima di sparire* e' molto piu' vicino al vero di
 * quello che chiedeva il primo giorno.
 *
 * Non basta finche' le riletture sono poche: con una sola raccolta non esiste
 * nessuna storia, e lo script lo dice invece di stampare zeri.
 */

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { storie, riassunto } from "./storie-lib.mjs";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVIO = join(RADICE, "data/annunci");
const RILETTURE = join(ARCHIVIO, "riletture");

function leggi(file) {
  const righe = readFileSync(file, "utf8").split("\n").filter((r) => r.trim());
  const testa = righe.shift().split(";").map((c) => c.trim());
  return righe.map((r) => Object.fromEntries(r.split(";").map((v, i) => [testa[i], v.trim()])));
}

const letture = [];
const dateRaccolta = new Set();

/* le riletture: una riga per annuncio per passaggio */
if (existsSync(RILETTURE)) {
  for (const f of readdirSync(RILETTURE).filter((f) => f.endsWith(".csv")).sort()) {
    for (const r of leggi(join(RILETTURE, f))) {
      letture.push({ rif: r.rif, fonte: r.fonte, data: r.data, prezzo: r.prezzo, zona: r.zona, stato: r.stato, mq: r.mq });
      if (r.data) dateRaccolta.add(r.data);
    }
  }
}

/* i lotti normali sono letture anche loro: se portano `rif`, entrano nella storia */
for (const f of readdirSync(ARCHIVIO).filter((f) => f.endsWith(".csv")).sort()) {
  for (const r of leggi(join(ARCHIVIO, f))) {
    if (!r.rif) continue;
    letture.push({ rif: r.rif, fonte: r.fonte, data: r.data, prezzo: r.prezzo_richiesto, zona: r.zona, stato: r.stato, mq: r.mq });
    if (r.data) dateRaccolta.add(r.data);
  }
}

const date = [...dateRaccolta].sort();
console.log(`passaggi di raccolta: ${date.length ? date.join(", ") : "nessuno"}`);
console.log(`letture con codice dell'annuncio: ${letture.length}`);

if (date.length < 2) {
  console.log(`\nServono almeno due passaggi in giorni diversi: con uno solo non c'e' nessuna storia,`);
  console.log(`solo una fotografia. Il prossimo passo e' rileggere gli stessi annunci fra due settimane`);
  console.log(`(npm run riletture) — non raccoglierne di nuovi.\n`);
  process.exit(0);
}

const S = storie(letture, date);
const finite = S.filter((s) => s.sparito);
const vive = S.filter((s) => !s.sparito);
console.log(`annunci seguiti: ${S.length} · usciti dal mercato: ${finite.length} · ancora in vendita: ${vive.length}`);

if (!finite.length) {
  console.log(`\nNessun annuncio e' ancora uscito dal mercato: non c'e' niente da misurare.\n`);
  process.exit(0);
}

const pct = (x) => (x === null ? "—" : `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`);
function tabella(titolo, righe) {
  console.log(`\n${titolo}`);
  for (const r of righe) {
    if (r.n < 3) continue; // sotto tre storie non e' una mediana, e' un aneddoto
    console.log(`  ${String(r.gruppo).padEnd(12)} n=${String(r.n).padStart(4)}  ribasso mediano ${pct(r.ribassoMediano).padStart(7)}  ` +
      `ha ribassato ${(r.quotaConRibasso * 100).toFixed(0).padStart(3)}%  visto per ${r.giorniMediani} giorni`);
  }
}

console.log(`\nQUANTO CALA IL PREZZO PRIMA CHE L'ANNUNCIO SPARISCA`);
tabella("TUTTI", riassunto(S));
tabella("PER FASCIA", riassunto(S, (s) => s.fascia));
tabella("PER STATO", riassunto(S, (s) => s.stato));
tabella("PER ZONA (le piu' seguite)", riassunto(S, (s) => s.zona).slice(0, 8));

console.log(`\nCOME LEGGERLO`);
console.log(`  «Sparito» non vuol dire «venduto»: un annuncio esce anche se ritirato, scaduto o`);
console.log(`  ripubblicato altrove. E «visto per N giorni» parte dalla prima volta che l'abbiamo`);
console.log(`  letto, non da quando e' stato pubblicato: e' un minimo, non il tempo sul mercato.`);
console.log(`  Il ribasso mediano e' quindi una stima **per difetto** dello sconto reale.`);
console.log(`  Non entra nel motore finche' non ci sono abbastanza storie: vedi docs/taratura.md.\n`);
