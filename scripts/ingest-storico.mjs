/**
 * Canoni di locazione e storico delle quotazioni OMI di Milano.
 *
 * Fonte: Agenzia delle Entrate, "Quotazioni OMI — riepilogo compravendita e
 * locazione" (DS1996 sul portale open data del Comune di Milano, CC BY 4.0).
 * Un'unica tabella con tutti i semestri dal 2004, per zona, tipologia e stato,
 * con i prezzi di compravendita (euro/mq) e i canoni di locazione (euro/mq al
 * mese). Il file grezzo pesa 3 MB e non entra nel repo: si scarica dal
 * portale e si passa a questo script, che produce due file versionati:
 *
 *   data/locazioni-omi-AAAA-S.json  i canoni dell'ultimo semestre, per zona,
 *                                   tipologia e stato: la base della rendita
 *   data/omi-storico.json           per ogni zona, semestre per semestre dal
 *                                   2014, prezzi e canoni delle abitazioni
 *                                   civili: l'andamento
 *
 * Il secondo semestre 2014 non e' una scelta: e' quando l'Agenzia ha ridisegnato le zone
 * di Milano. Prima i codici erano altri (B01, C02...) e confrontarli con
 * quelli di oggi vorrebbe dire confrontare perimetri diversi. Quattro zone
 * sono nate nel secondo semestre 2024 da uno sdoppiamento: per loro la serie
 * comincia li', e lo diciamo.
 *
 *   node scripts/ingest-storico.mjs percorso/al/ds1996.csv
 *
 * I semestri successivi al riepilogo arrivano dalla fornitura QIP dell'Agenzia:
 * scripts/ingest-fornitura.mjs li aggiunge in coda allo storico.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const QUI = dirname(fileURLToPath(import.meta.url));
const RADICE = process.env.RADICE_PROGETTO || join(QUI, "..");
const DATI = join(RADICE, "data");

const CSV = process.argv[2];
if (!CSV) { console.error("Uso: node scripts/ingest-storico.mjs percorso/al/ds1996.csv"); process.exit(1); }

const TIPI = { "Abitazioni civili": "civ", "Abitazioni signorili": "sig", "Abitazioni di tipo economico": "eco", "Ville e Villini": "vil" };
const DAL = "2014-2";
const num = (s) => { const v = parseFloat((s || "").replace(",", ".")); return Number.isFinite(v) ? v : null; };

const righe = readFileSync(resolve(CSV), "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const testata = righe.shift().split(";");
const col = (n) => { const k = testata.indexOf(n); if (k < 0) throw new Error(`colonna mancante: ${n}`); return k; };
const C = Object.fromEntries(["Anno", "Periodo", "Comune_descrizione", "Zona", "Descr_Tipologia", "Stato", "Compr_min", "Compr_max", "Loc_min", "Loc_max"].map((n) => [n, col(n)]));

/** zona -> semestre -> tipo -> stato -> { c: [min,max], l: [min,max] } */
const tab = {};
let ultimo = "";
for (const riga of righe) {
  const c = riga.split(";");
  if (c[C.Comune_descrizione] !== "MILANO") continue;
  const tipo = TIPI[c[C.Descr_Tipologia]];
  if (!tipo) continue;
  const sem = `${c[C.Anno]}-${c[C.Periodo][0]}`;
  const stato = (c[C.Stato] || "NORMALE").trim() || "NORMALE";
  const zona = c[C.Zona].trim();
  const v = { c: [num(c[C.Compr_min]), num(c[C.Compr_max])], l: [num(c[C.Loc_min]), num(c[C.Loc_max])] };
  if (!v.c[0]) continue;
  (((tab[zona] ||= {})[sem] ||= {})[tipo] ||= {})[stato] = v;
  if (sem > ultimo) ultimo = sem;
}

const zoneAttuali = Object.keys(tab).filter((z) => tab[z][ultimo]).sort();
if (zoneAttuali.length < 30) throw new Error(`solo ${zoneAttuali.length} zone nell'ultimo semestre (${ultimo}): tracciato sospetto`);

// ---- canoni dell'ultimo semestre
const locazioni = {};
for (const z of zoneAttuali) {
  locazioni[z] = { civ: {}, sig: {}, eco: {}, vil: {} };
  for (const tipo in tab[z][ultimo])
    for (const stato in tab[z][ultimo][tipo]) {
      const l = tab[z][ultimo][tipo][stato].l;
      if (l[0] && l[1]) locazioni[z][tipo][stato] = l;
    }
}

// ---- storico: abitazioni civili dal 2014-2
/* Lo stato e' "normale" quasi ovunque. In tre zone di nuova edificazione (Porta
   Nuova, CityLife...) l'OMI quota solo "ottimo": li' la serie segue quello,
   e il file lo dice, perche' una serie che cambia stato a meta' farebbe un
   gradino che non esiste. */
const storico = {};
let nuove = 0;
for (const z of zoneAttuali) {
  const semestri = Object.keys(tab[z]).filter((s) => s >= DAL).sort();
  const copertura = (stato) => semestri.filter((s) => tab[z][s].civ?.[stato]).length;
  const stato = copertura("NORMALE") >= copertura("OTTIMO") ? "NORMALE" : "OTTIMO";
  const serie = semestri.filter((s) => tab[z][s].civ?.[stato]).map((s) => ({ s, ...tab[z][s].civ[stato] }));
  if (serie[0]?.s !== DAL) nuove++;
  storico[z] = { dal: serie[0]?.s, stato, serie };
}

const meta = {
  fonte: "Agenzia delle Entrate — Quotazioni OMI, riepilogo compravendita e locazione (via Comune di Milano, CC BY 4.0)",
  generato: new Date().toISOString().slice(0, 10),
  semestre: ultimo,
  dal: DAL,
  nota: "Prezzi in euro/mq; canoni in euro/mq al mese. Serie: abitazioni civili nello stato indicato per zona. Zone ridisegnate nel 2014.",
};
writeFileSync(join(DATI, `locazioni-omi-${ultimo}.json`), JSON.stringify(locazioni));
writeFileSync(join(DATI, "omi-storico.json"), JSON.stringify({ meta, zone: storico }));

console.log(`ultimo semestre      ${ultimo}`);
console.log(`zone                 ${zoneAttuali.length}`);
console.log(`zone nate dopo il ${DAL.slice(0, 4)}: ${nuove}`);
console.log(`semestri in serie    ${storico[zoneAttuali[0]].serie.length} (${zoneAttuali[0]})`);
