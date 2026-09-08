"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPOTESI_BREVE_BASE = exports.annoDi = exports.semestreBreve = exports.FISCO_AFFITTO = exports.STORICO = exports.SEMESTRE_LOCAZIONI = exports.LOCAZIONI = void 0;
exports.canoneBase = canoneBase;
exports.rendita = rendita;
exports.andamento = andamento;
exports.tariffaPrudente = tariffaPrudente;
exports.affittoBreve = affittoBreve;
const locazioni_omi_2025_2_json_1 = __importDefault(require("../../data/locazioni-omi-2025-2.json"));
const omi_storico_json_1 = __importDefault(require("../../data/omi-storico.json"));
const data_1 = require("./data");
const engine_1 = require("./engine");
/* --------------------------------------------------------------------------
   Rendita da locazione e andamento della zona.

   L'OMI pubblica, accanto ai prezzi, i canoni di locazione in euro al mq al
   mese, per le stesse zone, tipologie e stati. Sono un dato ufficiale, non
   una stima nostra: qui li si porta sull'immobile con la stessa logica del
   prezzo, senza inventare un secondo motore.

   Niente qui tocca la stima del valore: engine.ts resta l'unica fonte del
   prezzo. Questo modulo legge la stima e la traduce in canone.
   -------------------------------------------------------------------------- */
exports.LOCAZIONI = locazioni_omi_2025_2_json_1.default;
exports.SEMESTRE_LOCAZIONI = "2025 · 2° semestre";
exports.STORICO = omi_storico_json_1.default.zone;
/** Tassazione del canone libero: cedolare secca ordinaria. */
exports.FISCO_AFFITTO = {
    cedolare: 0.21,
    /** un mese all'anno fra un inquilino e l'altro: prudente, dichiarato */
    mesiSfitto: 1,
};
/** Canone al mq al mese per stato, ancorato alle mediane OMI come il prezzo. */
function canoneBase(zona, tipo, stato) {
    const z = exports.LOCAZIONI[zona];
    if (!z)
        return null;
    let t = z[tipo];
    const ripiego = !t || !Object.keys(t).length;
    if (ripiego)
        t = z.civ;
    const N = t.NORMALE, O = t.OTTIMO;
    if (!N && !O)
        return null;
    const mediaN = N ? (N[0] + N[1]) / 2 : O[0] * 0.85;
    const mediaO = O ? (O[0] + O[1]) / 2 : N[1] * 1.15;
    /* Lo stesso premio compresso del prezzo: la taratura ha misurato che il
       mercato paga lo stato meno di quanto la forbice OMI suggerisca, e non c'e'
       motivo di credere che l'affitto faccia diversamente. */
    const f = data_1.ZONE[zona]?.f || "D";
    const premio = Math.pow(mediaO / mediaN, engine_1.PARAMETRI.compressioneStato[f] ?? engine_1.COMPRESSIONE_STATO);
    const mq = stato === "rist" ? mediaN * engine_1.PARAMETRI.scontoRist
        : stato === "abit" ? mediaN
            : stato === "otti" ? mediaN * premio
                : mediaN * premio * 1.06;
    return { euroMqMese: mq, ripiego, banda: [N?.[0] ?? O[0], O?.[1] ?? N[1]] };
}
/**
 * Dal valore stimato al canone: le stesse caratteristiche che spostano il
 * prezzo rispetto alla base OMI (piano, ascensore, classe, luce) spostano il
 * canone rispetto alla base dei canoni, nella stessa proporzione.
 */
function rendita(i, stima) {
    const base = canoneBase(i.zona, i.tipo, i.stato);
    if (!base)
        return null;
    const fattore = stima.baseOmi > 0 ? stima.euroMq / stima.baseOmi : 1;
    const euroMqMese = base.euroMqMese * fattore;
    const canoneMese = Math.round((euroMqMese * stima.superficieCommerciale) / 10) * 10;
    const annuoLordo = canoneMese * 12;
    const annuoNetto = annuoLordo * ((12 - exports.FISCO_AFFITTO.mesiSfitto) / 12) * (1 - exports.FISCO_AFFITTO.cedolare);
    return {
        canoneMese, euroMqMese, annuoLordo,
        lordo: annuoLordo / stima.centro,
        annuoNetto, netto: annuoNetto / stima.centro,
        anniRipago: stima.centro / annuoNetto,
        ripiego: base.ripiego,
        banda: base.banda,
    };
}
/** Semestre "2014-2" -> "2° sem. 2014" */
const semestreBreve = (s) => `${s.slice(5)}° sem. ${s.slice(0, 4)}`;
exports.semestreBreve = semestreBreve;
const annoDi = (s) => s.slice(0, 4);
exports.annoDi = annoDi;
/** L'andamento della zona, prezzi e canoni mediani OMI, semestre per semestre. */
function andamento(zona) {
    const z = exports.STORICO[zona];
    if (!z || !z.serie.length)
        return null;
    const punti = z.serie.map((p) => ({ s: p.s, prezzo: (p.c[0] + p.c[1]) / 2, canone: p.l[0] && p.l[1] ? (p.l[0] + p.l[1]) / 2 : NaN }));
    const primo = punti[0], ultimo = punti[punti.length - 1];
    /* "due anni fa" per etichetta, non per posizione: se un semestre mancasse,
       contare quattro punti indietro sposterebbe il confronto senza dirlo */
    const etichettaDueAnni = `${Number(ultimo.s.slice(0, 4)) - 2}${ultimo.s.slice(4)}`;
    const dueAnni = punti.find((p) => p.s === etichettaDueAnni) || null;
    return {
        dal: z.dal, stato: z.stato, punti,
        variazione: ultimo.prezzo / primo.prezzo - 1,
        variazione2anni: dueAnni ? ultimo.prezzo / dueAnni.prezzo - 1 : null,
        variazioneCanone: ultimo.canone / primo.canone - 1,
        rendimentoZona: (ultimo.canone * 12) / ultimo.prezzo,
        nuova: punti.length < 4,
    };
}
exports.IPOTESI_BREVE_BASE = {
    occupazione: 0.55, commissioni: 0.15, pulizie: 55, soggiorno: 3, utenze: 200, gestione: 0, cedolare: 0.21,
};
/** Tariffa prudente: ancorata al canone mensile della zona, non al mercato turistico. */
function tariffaPrudente(canoneMese) {
    return Math.max(60, Math.round(canoneMese / 9 / 5) * 5);
}
function affittoBreve(ip, lungo, stima) {
    const notti = 365 * ip.occupazione;
    const lordo = ip.tariffa * notti;
    const commissioni = lordo * ip.commissioni;
    const pulizie = (notti / ip.soggiorno) * ip.pulizie;
    const utenze = ip.utenze * 12;
    const gestione = lordo * ip.gestione;
    /* La cedolare si paga sul corrispettivo lordo, non sull'utile: e' la
       differenza che fa sembrare l'affitto breve piu' ricco di quanto sia. */
    const cedolare = lordo * ip.cedolare;
    const netto = lordo - commissioni - pulizie - utenze - gestione - cedolare;
    // netto(occ) = occ * 365 * margineNotte - utenze  =>  occ* = (nettoLungo + utenze) / (365 * margineNotte)
    const margineNotte = ip.tariffa * (1 - ip.commissioni - ip.gestione - ip.cedolare) - ip.pulizie / ip.soggiorno;
    const occ = margineNotte > 0 ? (lungo.annuoNetto + utenze) / (365 * margineNotte) : Infinity;
    return {
        notti, lordo, commissioni, pulizie, utenze, gestione, cedolare, netto,
        rendimentoNetto: netto / stima.centro,
        pareggio: Number.isFinite(occ) && occ <= 1 ? occ : null,
        differenza: netto - lungo.annuoNetto,
    };
}
