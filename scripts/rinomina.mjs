#!/usr/bin/env node
/**
 * Rinomina il prodotto in un colpo solo.
 *
 *   node scripts/rinomina.mjs --nome Stimami --prova    # mostra cosa cambierebbe
 *   node scripts/rinomina.mjs --nome Stimami            # applica
 *
 * Esiste perche' il nome vive in undici punti diversi e dimenticarne uno lascia
 * un prodotto che si chiama in due modi. La chiave di localStorage non viene
 * semplicemente sostituita: quella uscente finisce in CHIAVI_DISMESSE, cosi'
 * chi aveva stime salvate non le perde.
 *
 * Non tocca GitHub, Vercel e Supabase: quelli si rinominano dai rispettivi
 * pannelli, e il promemoria e' stampato alla fine.
 */
import { readFileSync, writeFileSync } from "node:fs";

const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const prova = process.argv.includes("--prova");
const nuovo = arg("--nome");
if (!nuovo || !/^[A-Z][a-zA-Z]{2,15}$/.test(nuovo)) {
  console.error("Uso: node scripts/rinomina.mjs --nome NuovoNome [--prova]");
  console.error("Il nome deve iniziare per maiuscola, solo lettere, 3-16 caratteri.");
  process.exit(1);
}

/* Il nome attuale si legge dal codice, non si scrive a mano: cosi' lo script
   resta valido anche al terzo rename. */
const testata = readFileSync("src/components/sistema/Header.tsx", "utf8");
const m = testata.match(/className="v-brand"[^>]*>\s*([A-Za-z]+)<span(?: aria-hidden="true")?>([A-Za-z])<\/span>/);
if (!m) { console.error("Non trovo il marchio in Header.tsx: lo script va aggiornato."); process.exit(1); }
const attuale = m[1] + m[2];                    // es. "Stimami"
const min = attuale.toLowerCase();
const nuovoMin = nuovo.toLowerCase();

if (attuale === nuovo) { console.log(`Si chiama gia' ${nuovo}.`); process.exit(0); }

/* marchio: l'ultima lettera prende il colore d'accento */
const marchio = (n) => `${n.slice(0, -1)}<span aria-hidden="true">${n.slice(-1)}</span>`;

const sostituzioni = [
  ["src/components/sistema/Header.tsx", [[`${attuale.slice(0, -1)}<span>${attuale.slice(-1)}</span>`, `${nuovo.slice(0, -1)}<span>${nuovo.slice(-1)}</span>`]]],
  ["src/app/layout.tsx",      [[attuale, nuovo]]],
  ["src/app/page.tsx",        [[marchio(attuale), marchio(nuovo)], [attuale, nuovo]]],
  ["src/app/valuta/page.tsx", [[marchio(attuale), marchio(nuovo)], [attuale, nuovo]]],
  ["src/app/quartieri/page.tsx", [[marchio(attuale), marchio(nuovo)], [attuale, nuovo]]],
  ["package.json",            [[`"name": "${min}"`, `"name": "${nuovoMin}"`]]],
  ["README.md",               [[attuale, nuovo], [min, nuovoMin]]],
  ["scripts/ingest-omi.mjs",  [[`${min} ingest`, `${nuovoMin} ingest`]]],
  ["src/lib/geocode.ts",      [[`"${min}/0.1"`, `"${nuovoMin}/0.1"`]]],
  [".env.example",            [[`${min}/0.1`, `${nuovoMin}/0.1`]]],
  [".env.local",              [[`${min}/0.1`, `${nuovoMin}/0.1`]]],
];

let toccati = 0;
for (const [file, coppie] of sostituzioni) {
  let testo;
  try { testo = readFileSync(file, "utf8"); } catch { continue; }
  const prima = testo;
  for (const [da, a] of coppie) testo = testo.split(da).join(a);
  if (testo !== prima) {
    toccati++;
    const n = prima.split("\n").filter((r, i) => r !== testo.split("\n")[i]).length;
    console.log(`${prova ? "cambierebbe" : "aggiornato"}  ${file}  (${n} righe)`);
    if (!prova) writeFileSync(file, testo);
  }
}

/* La chiave di localStorage: quella uscente va conservata, non sostituita. */
const fs = "src/lib/storage.ts";
let st = readFileSync(fs, "utf8");
const chiaveVecchia = `${min}.stime`, chiaveNuova = `${nuovoMin}.stime`;
if (st.includes(`const CHIAVE = "${chiaveVecchia}"`)) {
  st = st.replace(`const CHIAVE = "${chiaveVecchia}"`, `const CHIAVE = "${chiaveNuova}"`);
  st = st.replace("const CHIAVI_DISMESSE = [", `const CHIAVI_DISMESSE = ["${chiaveVecchia}", `);
  console.log(`${prova ? "cambierebbe" : "aggiornato"}  ${fs}  (chiave ${chiaveVecchia} -> ${chiaveNuova}, la vecchia resta migrabile)`);
  if (!prova) writeFileSync(fs, st);
  toccati++;
}

console.log(`\n${prova ? "Prova: " : ""}${toccati} file, da "${attuale}" a "${nuovo}".`);
if (!prova) {
  console.log(`
Restano da fare a mano, fuori dal codice:
  1. GitHub    Settings -> Repository name -> ${nuovo}
               poi in locale: git remote set-url origin <nuovo url>
  2. Vercel    Settings -> General -> Project Name, e Domains
  3. Supabase  Authentication -> URL Configuration: Site URL e Redirect URLs
  4. Verifica  npm run typecheck && npm test && npm run build
  5. Cerca gli avanzi:  grep -ri "${min}" src docs *.md --exclude-dir=node_modules`);
}
