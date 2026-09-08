"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FASCIA_NOME = exports.INDICE_ISTAT = exports.FONTE = exports.SEMESTRE = exports.NOMI = exports.ZONE = void 0;
exports.cercaZona = cercaZona;
const quotazioni_omi_2025_2_json_1 = __importDefault(require("../../data/quotazioni-omi-2025-2.json"));
const nomi_zone_json_1 = __importDefault(require("../../data/nomi-zone.json"));
exports.ZONE = quotazioni_omi_2025_2_json_1.default;
exports.NOMI = nomi_zone_json_1.default;
/** Semestre a cui si riferiscono le quotazioni caricate. Aggiornato da scripts/ingest-fornitura.mjs o ingest-omi.mjs */
exports.SEMESTRE = "2025 · 2° semestre";
/* Le quotazioni e i perimetri 2025/2 arrivano dalla fornitura diretta dell'Agenzia
   delle Entrate (file QIP e KML); dal Comune di Milano (CC BY 4.0) arrivano l'anagrafe
   dei civici e la serie storica fino al 2024. L'attribuzione lo dice per esteso. */
exports.FONTE = "Agenzia delle Entrate — Osservatorio del Mercato Immobiliare, quotazioni e perimetri forniti dall'Agenzia (2025/2); serie storica e anagrafe dei civici dal Comune di Milano (CC BY 4.0)";
/**
 * Indice Istat dei prezzi delle abitazioni (IPAB): porta la base OMI, che esce con
 * mesi di ritardo, al trimestre corrente. Base: 2° semestre 2025 (media del terzo e
 * quarto trimestre). Istat: +0,9% nel quarto trimestre 2025 sul terzo, +1,0% nel
 * primo trimestre 2026 sul quarto (stima preliminare, giugno 2026). Dalla media
 * del semestre al primo trimestre 2026: circa +1,5%. Da rifare quando esce il
 * secondo trimestre 2026 (fine settembre), vedi README.
 */
exports.INDICE_ISTAT = 1.015;
exports.FASCIA_NOME = {
    B: "Centro", C: "Semicentro", D: "Periferia", E: "Suburbana", R: "Extraurbana",
};
/** Ricerca per nome di via, piazza o quartiere. Euristica: va sempre fatta confermare. */
function cercaZona(q, max = 7) {
    const s = q.trim().toLowerCase();
    if (s.length < 2)
        return [];
    const out = [];
    for (const { n, z } of exports.NOMI) {
        if (n.toLowerCase().includes(s) && exports.ZONE[z]) {
            out.push({ nome: n, zona: z, descrizione: exports.ZONE[z].d });
            if (out.length >= max)
                break;
        }
    }
    return out;
}
