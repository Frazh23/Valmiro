/**
 * L'archivio degli annunci: data/annunci/*.csv, un file per lotto.
 *
 * Ogni lotto e' un CSV con lo stesso tracciato (vedi data/annunci/README.md) e
 * un nome che dice quando e da dove: 2026-09-05-vendite-fz.csv,
 * 2026-10-01-idealista.csv. L'archivio cresce aggiungendo file, mai
 * riscrivendo quelli vecchi: un annuncio del 2026 resta un prezzo del 2026.
 *
 * caricaAnnunci() legge tutti i lotti (o il file indicato), scarta le righe
 * senza metri o prezzo e toglie i duplicati — stesso indirizzo, stessi metri,
 * stesso prezzo — tenendo la lettura piu' recente. Restituisce righe grezze
 * (stringhe) piu' `lotto`: la conversione in Input del motore la fa chi usa
 * i dati, perche' calibrazione e comparabili non chiedono le stesse cose.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

export const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ARCHIVIO = join(RADICE, "data/annunci");

export const siNo = (v) => /^(si|sì|s|true|1|x)$/i.test(v || "");
export const oNull = (v) => (v ? v : null);

/** CSV con celle quotate, separatori e a-capo incorporati. */
export function parseCsv(text, delimiter = ";") {
  const rows = []; let row = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let n = 0; n < text.length; n++) {
    const c = text[n];
    if (c === '"') {
      if (quoted && text[n + 1] === '"') { cell += '"'; n++; }
      else quoted = !quoted;
    } else if (!quoted && c === delimiter) { row.push(cell.trim()); cell = ""; }
    else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[n+1] === "\n") n++;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV: cella quotata non chiusa");
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  const header = rows.shift() || [];
  return rows.map((cells, n) => {
    if (cells.length !== header.length) throw new Error(`CSV: numero colonne errato alla riga ${n+2}`);
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });
}
export function leggiFile(percorso) {
  return parseCsv(readFileSync(percorso, "utf8")).map(r => ({ ...r, lotto: basename(percorso, ".csv") }));
}
export function ruoloLotto(percorso) {
  const manifest = percorso.replace(/\.csv$/, ".meta.json");
  const byName = /-verifica(?:[.-]|$)/.test(basename(percorso));
  if (!existsSync(manifest)) return byName ? "verifica" : "taratura";
  const m = JSON.parse(readFileSync(manifest, "utf8"));
  if (!["taratura", "verifica"].includes(m.ruolo) || (byName && m.ruolo !== "verifica")) throw new Error("Ruolo lotto incoerente");
  return m.ruolo;
}

/** Chiave di duplicato: via e civico senza maiuscole/accenti, metri, prezzo. */
export function chiaveAnnuncio(r) {
  const ind = (r.indirizzo || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return `${ind}|${r.mq}|${r.prezzo_richiesto}`;
}

/**
 * @param {string} [percorso]  un file CSV; se manca, tutto l'archivio
 * @returns {{ annunci: object[], lotti: string[], duplicati: number, scartati: number }}
 */
export function caricaAnnunci(percorso, { ruolo = "taratura" } = {}) {
  let file;
  if (percorso) {
    if (!existsSync(percorso)) throw new Error(`manca ${percorso}`);
    file = statSync(percorso).isDirectory()
      ? readdirSync(percorso).filter((f) => f.endsWith(".csv")).sort().map((f) => join(percorso, f))
      : [percorso];
  } else {
    file = existsSync(ARCHIVIO) ? readdirSync(ARCHIVIO).filter((f) => f.endsWith(".csv")).sort().map((f) => join(ARCHIVIO, f)) : [];
  }

  if (percorso && statSync(percorso).isFile() && ruoloLotto(percorso) !== ruolo)
    throw new Error(`Lotto ${ruoloLotto(percorso)} non ammesso per ${ruolo}`);
  file = file.filter(f => ruoloLotto(f) === ruolo);
  const visti = new Map();
  let duplicati = 0, scartati = 0;
  for (const f of file) {
    for (const r of leggiFile(f)) {
      if (!(Number(r.mq) > 0) || !(Number(r.prezzo_richiesto) > 0)) { scartati++; continue; }
      const k = chiaveAnnuncio(r);
      const prima = visti.get(k);
      if (prima) {
        duplicati++;
        if ((r.data || "") <= (prima.data || "")) continue; // resta la lettura piu' recente
      }
      visti.set(k, r);
    }
  }
  return { annunci: [...visti.values()], lotti: file.map((f) => basename(f)), duplicati, scartati };
}

/** Conversione corrente; i buchi restano espliciti nel rapporto. */
export function conversioneRiga(r, zona) {
  const mancanti = [], errori = [];
  const required = (k, fallback) => { if (!r[k]) mancanti.push(k); return r[k] || fallback; };
  const valid = (k, value, allowed) => { if (!allowed.includes(value)) errori.push(`${k}: ${value}`); return value; };
  const mq = Number(r.mq);
  if (!Number.isFinite(mq) || mq <= 0) errori.push("superficie non valida");
  const rawClasse = (r.classe || "nd").trim().toUpperCase();
  const classe = /^(ND|N\/D|NON NOTA)$/.test(rawClasse) ? "nd" : /^A[1-4]$/.test(rawClasse) ? "A" : rawClasse;
  if (classe === "nd") mancanti.push("classe");
  valid("classe", classe, ["nd","A","B","C","D","E","F","G"]);
  const input = {
    zona, tipo: valid("tipo", required("tipo", "civ"), ["civ","sig","eco"]), mq,
    stato: valid("stato", required("stato", "abit"), ["rist","abit","otti","nuov"]),
    piano: valid("piano", required("piano", "1-2"), ["terra","rialzato","1-2","3-5","6+","ultimo"]),
    ascensore: siNo(required("ascensore", "si")), classe,
    superficie: required("superficie", "commerciale"), pertinenzeIncluse: siNo(required("pertinenze_incluse", "si")),
    mqBalconi: Number(r.mq_balconi) || 0, mqTerrazzi: Number(r.mq_terrazzi) || 0,
    cantina: siNo(required("cantina", "no")), box: "nessuno",
    epoca: oNull(r.epoca), affaccio: oNull(r.affaccio), metro: oNull(r.metro)
  };
  for (const [k, allowed] of [["epoca",["ante1945","1946-1980","1981-2005","post2005"]],["affaccio",["interno","misto","strada"]],["metro",["vicina","media","lontana"]]]) if (r[k]) valid(k,r[k],allowed);
  valid("superficie", input.superficie, ["commerciale","calpestabile"]);
  for (const k of ["ascensore", "cantina", "pertinenze_incluse", "box_incluso"]) if (r[k] && !/^(si|sì|s|true|1|x|no|false|0)$/i.test(r[k])) errori.push(`${k}: valore non riconosciuto`);
  for (const k of ["mq_balconi", "mq_terrazzi"]) if (r[k] && (!Number.isFinite(Number(r[k])) || Number(r[k]) < 0)) errori.push(`${k}: superficie non valida`);
  if (Number(r.balconi) > 0 && !r.mq_balconi) mancanti.push("metri balconi (il conteggio non viene convertito)");
  if (r.box && r.box !== "nessuno") {
    if (siNo(r.box_incluso)) input.box = valid("box", r.box, ["box","posto"]);
    else mancanti.push("box escluso: inclusione nel prezzo non documentata");
  }
  return { input, mancanti, errori };
}
export function inputDaRiga(r, zona) {
  const c = conversioneRiga(r, zona);
  if (c.errori.length) throw new Error(c.errori.join("; "));
  return c.input;
}
