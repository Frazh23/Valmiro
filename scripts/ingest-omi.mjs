#!/usr/bin/env node
/* --------------------------------------------------------------------------
   Aggiornamento automatico delle quotazioni OMI di Milano.

   Il portale open data del Comune gira su CKAN ed espone un'API pubblica senza
   chiave: il job si accorge da solo quando esce un semestre nuovo. Gli URL delle
   risorse contengono identificativi che cambiano a ogni pubblicazione, per questo
   non vanno mai scritti nel codice: si passa sempre dall'API.

   Uso:  node scripts/ingest-omi.mjs [--dry]
   Cron: una volta a settimana. Le quotazioni escono due volte l'anno, ma senza
         data certa: sondare spesso costa una chiamata e ti fa trovare il dato
         il giorno stesso in cui esce.
   -------------------------------------------------------------------------- */

import { writeFile, readFile } from "node:fs/promises";

const CKAN = "https://dati.comune.milano.it/api/3/action";
const DRY = process.argv.includes("--dry");

const log = (...a) => console.log("[ingest]", ...a);

async function json(url) {
  const r = await fetch(url, { headers: { "User-Agent": "valmiro ingest" } });
  if (!r.ok) throw new Error(`${url} ha risposto ${r.status}`);
  return r.json();
}

/** Cerca i dataset OMI e ne estrae anno e semestre dallo slug. */
async function trovaDataset() {
  const d = await json(`${CKAN}/package_search?q=OMI&rows=200&sort=metadata_modified%20desc`);
  const out = [];
  for (const p of d.result.results) {
    const m = p.name.match(/(\d{4})-(\d)$/);
    if (!m) continue;
    const anno = +m[1], sem = +m[2];
    const tipo = p.name.includes("zone-e-perimetri") ? "zone"
      : p.name.includes("compravendita") ? "compravendita"
      : p.name.includes("locazione") ? "locazione" : null;
    if (tipo) out.push({ slug: p.name, anno, sem, tipo, modificato: p.metadata_modified });
  }
  return out;
}

async function risorse(slug) {
  const d = await json(`${CKAN}/package_show?id=${encodeURIComponent(slug)}`);
  return d.result.resources.map((r) => ({ nome: r.name, formato: (r.format || "").toUpperCase(), url: r.url }));
}

function piuRecente(lista, tipo) {
  return lista.filter((d) => d.tipo === tipo).sort((a, b) => b.anno - a.anno || b.sem - a.sem)[0];
}

async function semestreCaricato() {
  try {
    const t = await readFile(new URL("../src/lib/data.ts", import.meta.url), "utf8");
    const m = t.match(/SEMESTRE = "(\d{4}) · (\d)/);
    return m ? { anno: +m[1], sem: +m[2] } : null;
  } catch { return null; }
}

const main = async () => {
  const ds = await trovaDataset();
  if (!ds.length) throw new Error("Nessun dataset OMI trovato: il portale ha cambiato schema?");

  const quot = piuRecente(ds, "compravendita");
  const zone = piuRecente(ds, "zone");
  const attuale = await semestreCaricato();
  log(`ultimo pubblicato: quotazioni ${quot.anno}/${quot.sem}, zone ${zone.anno}/${zone.sem}`);
  log(`attualmente caricato: ${attuale ? attuale.anno + "/" + attuale.sem : "sconosciuto"}`);

  const nuovo = !attuale || quot.anno > attuale.anno || (quot.anno === attuale.anno && quot.sem > attuale.sem);
  if (!nuovo) { log("nessun semestre nuovo, niente da fare"); return; }

  log("SEMESTRE NUOVO DISPONIBILE");
  for (const [etichetta, d] of [["quotazioni", quot], ["zone", zone]]) {
    const rs = await risorse(d.slug);
    log(` ${etichetta} (${d.slug}):`);
    for (const r of rs) log(`   ${r.formato.padEnd(8)} ${r.url}`);
  }
  if (DRY) { log("--dry: mi fermo qui"); return; }

  /* Scarico e riscrittura di data/. Il parsing del CSV OMI e' quello usato per il
     semestre 2024/2: separatore ";", stati NORMALE e OTTIMO, tipologie residenziali
     piu' Box. Se il tracciato cambia, il job deve fallire rumorosamente, non
     scrivere dati sbagliati. */
  const rs = await risorse(quot.slug);
  const csv = rs.find((r) => r.formato === "CSV");
  if (!csv) throw new Error("Nessun CSV nel dataset delle quotazioni");
  const testo = await (await fetch(csv.url)).text();
  const righe = testo.split(/\r?\n/).filter(Boolean);
  const intest = righe[0].split(";");
  const col = (n) => { const k = intest.indexOf(n); if (k < 0) throw new Error(`Colonna mancante: ${n}`); return k; };
  const [cAnno, cPer, cZona, cTip, cStato, cMin, cMax] =
    ["Anno", "Periodo", "Zona", "Descr_Tipologia", "Stato", "Compr_min", "Compr_max"].map(col);

  const mappa = { "Abitazioni civili": "civ", "Abitazioni signorili": "sig",
    "Abitazioni di tipo economico": "eco", "Ville e Villini": "vil", Box: "box" };
  const num = (s) => { const v = parseFloat((s || "").replace(",", ".")); return Number.isFinite(v) ? v : null; };

  const zoneOut = {};
  let usate = 0;
  for (const r of righe.slice(1)) {
    const c = r.split(";");
    if (+c[cAnno] !== quot.anno || +c[cPer][0] !== quot.sem) continue;
    const chiave = mappa[c[cTip]];
    if (!chiave) continue;
    const min = num(c[cMin]), max = num(c[cMax]);
    if (!min) continue;
    const z = (zoneOut[c[cZona].trim()] ||= { civ: {}, sig: {}, eco: {}, vil: {}, box: null });
    if (chiave === "box") z.box = [min, max];
    else z[chiave][(c[cStato] || "NORMALE").trim() || "NORMALE"] = [min, max];
    usate++;
  }
  if (Object.keys(zoneOut).length < 30) throw new Error(`Solo ${Object.keys(zoneOut).length} zone: tracciato sospetto, non scrivo`);

  // conserva descrizione e fascia gia' presenti
  const { readdir } = await import("node:fs/promises");
  const ultimo = (await readdir(new URL("../data/", import.meta.url))).filter((n) => /^quotazioni-omi-\d{4}-\d\.json$/.test(n)).sort().pop();
  const vecchio = JSON.parse(await readFile(new URL(`../data/${ultimo}`, import.meta.url), "utf8"));
  for (const z in zoneOut) { zoneOut[z].d = vecchio[z]?.d || z; zoneOut[z].f = z[0]; }

  await writeFile(new URL(`../data/quotazioni-omi-${quot.anno}-${quot.sem}.json`, import.meta.url),
    JSON.stringify(zoneOut, null, 0));
  log(`scritte ${Object.keys(zoneOut).length} zone da ${usate} righe`);
  log(`ORA: aggiorna l'import e SEMESTRE in src/lib/data.ts, poi rilancia i test. Se hai la fornitura QIP dell'Agenzia (VALORI, ZONE, KML), preferisci npm run ingest-fornitura: fa tutto, canoni e perimetri compresi`);
  log(`E POI: scarica il riepilogo storico (DS1996) e lancia npm run ingest-storico, che rigenera canoni e andamento`);
};

main().catch((e) => { console.error("[ingest] FALLITO:", e.message); process.exit(1); });
