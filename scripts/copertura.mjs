/**
 * Quanto tiene l'intervallo che mostriamo.
 *
 *   npm run copertura                  → tutto l'archivio
 *   npm run copertura data/annunci/x.csv → un lotto solo
 *
 * Accanto al valore la pagina scrive «Intervallo indicativo del modello
 * 483.000 – 592.000 €». Non dichiara una probabilita', e fa bene: nessuno l'ha
 * mai misurata. Questo script la misura.
 *
 * Che cosa confronta. L'intervallo mostrato e' centro × (1 ∓ sigma). Il prezzo
 * che osserviamo negli annunci non e' il valore: e' il prezzo *chiesto*, che il
 * motore modella come `pubblica` = centro × 1,06. Quindi la banda giusta per
 * questo confronto e' pubblica × (1 ∓ sigma): stessa larghezza relativa,
 * centrata sulla grandezza che stiamo osservando. Confrontare il prezzo chiesto
 * con l'intervallo del valore misurerebbe due cose insieme e non direbbe niente
 * di nessuna delle due.
 *
 * Che cosa NON fa. Non propone un sigma nuovo da applicare. Allargare
 * l'intervallo finche' i numeri di questo campione tornano e' tararlo sul
 * campione su cui il modello e' gia' tarato: si otterrebbe un intervallo che
 * copre benissimo gli annunci del 5 settembre e non promette niente su nessun
 * altro. Il moltiplicatore che servirebbe viene stampato come *indicazione*, da
 * confermare su un lotto di verifica indipendente (docs/verifica.md).
 *
 * E ricordarsi sempre di che cosa e' fatto il campione: prezzi chiesti, non
 * prezzi di compravendita.
 */

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { RADICE, caricaAnnunci, inputDaRiga } from "./annunci.mjs";

const BUILD = join(RADICE, ".build-copertura");
execSync(
  `npx tsc src/lib/engine.ts src/lib/indirizzario.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`,
  { cwd: RADICE, stdio: "inherit" },
);
const require = createRequire(import.meta.url);
const motore = require(join(BUILD, "src/lib/engine.js"));
const indirizzario = require(join(BUILD, "src/lib/indirizzario.js"));

const archivio = caricaAnnunci(process.argv[2]);
console.log(`lotti: ${archivio.lotti.join(", ")} · ${archivio.annunci.length} annunci`);

const annunci = [];
for (const r of archivio.annunci) {
  let zona = r.zona;
  if (!zona && r.indirizzo) {
    const ris = indirizzario.risolvi(r.indirizzo);
    zona = ris.esito === "civico" ? ris.zona : ris.esito === "via" ? ris.via.zona : "";
  }
  if (!zona) continue;
  try { motore.scala(zona, "civ"); } catch { continue; }
  annunci.push({ id: r.id, zona, prezzo: Number(r.prezzo_richiesto), venduto: Number(r.prezzo_venduto) || null, input: inputDaRiga(r, zona) });
}
if (annunci.length < 20) {
  console.error(`Solo ${annunci.length} annunci utilizzabili: ne servono almeno 20.`);
  process.exit(1);
}

/* Per ogni annuncio: dov'e' finito il prezzo chiesto rispetto alla banda che
   avremmo mostrato, misurato in «quanti sigma» sta lontano dal centro. */
const misure = annunci.map((a) => {
  const s = motore.stima(a.input);
  const reale = a.venduto || a.prezzo;
  const riferimento = a.venduto ? s.centro : s.pubblica;
  const scarto = Math.log(reale / riferimento);
  const larghezza = Math.log(1 + s.sigma);
  return {
    id: a.id, zona: a.zona, fascia: a.zona[0], stato: a.input.stato, mq: a.input.mq,
    tipo: a.input.tipo, sigma: s.sigma, affidabilita: s.affidabilita,
    dentro: Math.abs(scarto) <= larghezza,
    sigmaDiScarto: scarto / larghezza,
  };
});

const q = (v, p) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const pc = (x) => `${(x * 100).toFixed(0)}%`;

function riga(nome, M) {
  if (!M.length) return;
  const dentro = M.filter((x) => x.dentro).length / M.length;
  const sigmaMedio = M.reduce((s, x) => s + x.sigma, 0) / M.length;
  console.log(`  ${nome.padEnd(12)} n=${String(M.length).padStart(3)}  dentro l'intervallo ${pc(dentro).padStart(4)}  (± ${(sigmaMedio * 100).toFixed(1)}% in media)`);
}

const tutti = misure;
const dentro = tutti.filter((x) => x.dentro).length / tutti.length;

console.log(`\nQUANTO TIENE L'INTERVALLO  ·  ${tutti.length} annunci`);
console.log(`\n  Il prezzo chiesto cade dentro l'intervallo mostrato nel ${pc(dentro)} dei casi.`);
console.log(`  L'intervallo non dichiara una probabilita': questo e' il numero che avrebbe.\n`);

console.log("PER FASCIA");
for (const f of ["B", "C", "D", "E"]) riga(f, tutti.filter((x) => x.fascia === f));
console.log("\nPER STATO");
for (const s of ["rist", "abit", "otti", "nuov"]) riga(s, tutti.filter((x) => x.stato === s));
console.log("\nPER TIPOLOGIA");
for (const t of ["civ", "sig", "eco", "vil"]) riga(t, tutti.filter((x) => x.tipo === t));
console.log("\nPER AFFIDABILITA' DICHIARATA");
for (const a of ["Alta", "Media", "Bassa"]) riga(a, tutti.filter((x) => x.affidabilita === a));
console.log("\nPER TAGLIA");
riga("fino a 60 mq", tutti.filter((x) => x.mq <= 60));
riga("61-110 mq", tutti.filter((x) => x.mq > 60 && x.mq <= 110));
riga("oltre 110 mq", tutti.filter((x) => x.mq > 110));

/* Da che parte esce chi esce: se sfora quasi sempre in alto, il problema non e'
   la larghezza ma il centro. */
const fuori = tutti.filter((x) => !x.dentro);
const sopra = fuori.filter((x) => x.sigmaDiScarto > 0).length;
console.log(`\nCHI RESTA FUORI  (${fuori.length} annunci)`);
console.log(`  sopra l'intervallo ${sopra} · sotto ${fuori.length - sopra}`);
if (fuori.length) {
  console.log(`  ${sopra > fuori.length * 0.65 || sopra < fuori.length * 0.35
    ? "Sbilanciato: il centro e' spostato, allargare l'intervallo non lo raddrizzerebbe."
    : "Bilanciato: chi esce, esce da entrambe le parti. E' larghezza, non centro."}`);
}

/* Indicazione, non ricetta. */
const scarti = tutti.map((x) => Math.abs(x.sigmaDiScarto));
console.log(`\nQUANTO SAREBBE LARGO UN INTERVALLO CHE TIENE  (indicazione, non da applicare)`);
for (const p of [0.5, 0.68, 0.8, 0.9]) {
  console.log(`  per coprire il ${pc(p)} degli annunci: sigma × ${q(scarti, p).toFixed(2)}`);
}
console.log(`\n  Questi moltiplicatori vengono dal campione su cui il motore e' gia' tarato:`);
console.log(`  applicarli qui vorrebbe dire promettere una copertura misurata su se stessa.`);
console.log(`  Si confermano su un lotto di verifica indipendente (docs/verifica.md).`);
console.log(`\n  E sono prezzi chiesti, non prezzi di compravendita.\n`);
