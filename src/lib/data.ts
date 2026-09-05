import zoneJson from "../../data/quotazioni-omi-2025-2.json";
import nomiJson from "../../data/nomi-zone.json";
import type { Zona } from "./types";

export const ZONE = zoneJson as unknown as Record<string, Zona>;
export const NOMI = nomiJson as { n: string; z: string }[];

/** Semestre a cui si riferiscono le quotazioni caricate. Aggiornato da scripts/ingest-fornitura.mjs o ingest-omi.mjs */
export const SEMESTRE = "2025 · 2° semestre";
/* Le quotazioni e i perimetri 2025/2 arrivano dalla fornitura diretta dell'Agenzia
   delle Entrate (file QIP e KML); dal Comune di Milano (CC BY 4.0) arrivano l'anagrafe
   dei civici e la serie storica fino al 2024. L'attribuzione lo dice per esteso. */
export const FONTE =
  "Agenzia delle Entrate — Osservatorio del Mercato Immobiliare, quotazioni e perimetri forniti dall'Agenzia (2025/2); serie storica e anagrafe dei civici dal Comune di Milano (CC BY 4.0)";

/**
 * Indice Istat dei prezzi delle abitazioni (IPAB): porta la base OMI, che esce con
 * mesi di ritardo, al trimestre corrente. Base: 2° semestre 2025 (media del terzo e
 * quarto trimestre). Istat: +0,9% nel quarto trimestre 2025 sul terzo, +1,0% nel
 * primo trimestre 2026 sul quarto (stima preliminare, giugno 2026). Dalla media
 * del semestre al primo trimestre 2026: circa +1,5%. Da rifare quando esce il
 * secondo trimestre 2026 (fine settembre), vedi README.
 */
export const INDICE_ISTAT = 1.015;

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
