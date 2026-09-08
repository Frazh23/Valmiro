"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FONTI = exports.PIANI_NON_QUOTATI = void 0;
exports.PIANI_NON_QUOTATI = ["seminterrato", "interrato"];
/**
 * Un indirizzo risolto in una zona OMI, con da dove viene la risposta:
 *   anagrafe   — il civico viene dall'anagrafe del Comune: e' il dato migliore
 *                che abbiamo, ufficiale e con le coordinate del portone;
 *   civico     — il geocoder ha trovato proprio quel numero: punto esatto;
 *   via        — ha trovato la via ma non il civico: zona giusta, punto generico.
 *                Conta, perche' una via lunga puo' attraversare piu' zone;
 *   dizionario — nessuna coordinata, solo il nome del quartiere: da confermare.
 * Un booleano non bastava: "non preciso" copriva due situazioni molto diverse e
 * l'interfaccia finiva per dire la cosa sbagliata in una delle due.
 */
exports.FONTI = ["anagrafe", "civico", "via", "dizionario"];
