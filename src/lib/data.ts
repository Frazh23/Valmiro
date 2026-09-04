import zoneJson from "../../data/quotazioni-omi-2024-2.json";
import nomiJson from "../../data/nomi-zone.json";
import type { Zona } from "./types";

export const ZONE = zoneJson as unknown as Record<string, Zona>;
export const NOMI = nomiJson as { n: string; z: string }[];

/** Semestre a cui si riferiscono le quotazioni caricate. Aggiornato da scripts/ingest-omi.mjs */
export const SEMESTRE = "2024 · 2° semestre";
export const FONTE =
  "Agenzia delle Entrate — Osservatorio del Mercato Immobiliare, via Comune di Milano (CC BY 4.0)";

/**
 * Indice Istat dei prezzi delle abitazioni: porta la base OMI, che esce con mesi di
 * ritardo, al trimestre corrente. Va aggiornato trimestralmente, vedi README.
 */
export const INDICE_ISTAT = 1.024;

export const FASCIA_NOME: Record<string, string> = {
  B: "Centro", C: "Semicentro", D: "Periferia", E: "Suburbana", R: "Extraurbana",
};

/** Ricerca per nome di via, piazza o quartiere. Euristica: va sempre fatta confermare. */
export function cercaZona(q: string, max = 7) {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const out: { nome: string; zona: string; descrizione: string }[] = [];
  for (const { n, z } of NOMI) {
    if (n.toLowerCase().includes(s) && ZONE[z]) {
      out.push({ nome: n, zona: z, descrizione: ZONE[z].d });
      if (out.length >= max) break;
    }
  }
  return out;
}
