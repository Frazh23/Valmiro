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

function leggiFile(percorso) {
  const righe = readFileSync(percorso, "utf8").split(/\r?\n/).filter((r) => r.trim());
  const testata = righe.shift().split(";").map((s) => s.trim());
  const lotto = basename(percorso, ".csv");
  return righe.map((riga) => {
    const c = riga.split(";");
    const r = { lotto };
    testata.forEach((nome, i) => { r[nome] = (c[i] ?? "").trim(); });
    return r;
  });
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
export function caricaAnnunci(percorso) {
  let file;
  if (percorso) {
    if (!existsSync(percorso)) throw new Error(`manca ${percorso}`);
    file = statSync(percorso).isDirectory()
      ? readdirSync(percorso).filter((f) => f.endsWith(".csv")).sort().map((f) => join(percorso, f))
      : [percorso];
  } else {
    file = existsSync(ARCHIVIO) ? readdirSync(ARCHIVIO).filter((f) => f.endsWith(".csv")).sort().map((f) => join(ARCHIVIO, f)) : [];
  }

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

/** Da riga dell'archivio a Input del motore. Vuoti -> valori piu' comuni. */
export function inputDaRiga(r, zona) {
  return {
    zona,
    tipo: r.tipo || "civ",
    mq: Number(r.mq),
    stato: r.stato || "abit",
    piano: r.piano || "1-2",
    ascensore: siNo(r.ascensore),
    classe: (r.classe || "D").toUpperCase()[0],
    balconi: Number(r.balconi) || 0,
    cantina: siNo(r.cantina),
    box: r.box || "nessuno",
    epoca: oNull(r.epoca),
    affaccio: oNull(r.affaccio),
    metro: oNull(r.metro),
  };
}
