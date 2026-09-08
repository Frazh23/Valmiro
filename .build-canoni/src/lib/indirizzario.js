"use strict";
/* --------------------------------------------------------------------------
   Indirizzario di Milano.

   Tutti i numeri civici del Comune, ognuno con la sua zona OMI gia' calcolata
   da scripts/ingest-civici.mjs. Prima di questo modulo ogni indirizzo passava
   da Nominatim: una richiesta al secondo, e soprattutto i civici che
   OpenStreetMap non ha mai avuto semplicemente non esistevano. Qui la ricerca
   e' una lettura in memoria su dati ufficiali.

   Modulo puro e solo lato server (i dati pesano ~2 MB: non devono finire nel
   bundle del browser). Il geocoder resta come rete di sicurezza per gli
   indirizzi che l'anagrafe non copre.
   -------------------------------------------------------------------------- */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.META = void 0;
exports.normalizza = normalizza;
exports.spezza = spezza;
exports.suggerisci = suggerisci;
exports.risolvi = risolvi;
exports.suggerisciCivici = suggerisciCivici;
const vie_milano_json_1 = __importDefault(require("../../data/vie-milano.json"));
const civici_milano_json_1 = __importDefault(require("../../data/civici-milano.json"));
const VIE = vie_milano_json_1.default.vie;
exports.META = vie_milano_json_1.default.meta;
const CIVICI = civici_milano_json_1.default.civici;
/** Stessa normalizzazione dello script di ingest: senza accenti ne' punteggiatura. */
function normalizza(s) {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}
/**
 * Separa "Via Torino 12" in via e civico.
 * Il civico e' l'ultimo gruppo numerico, eventualmente con lettera: "12", "12/A",
 * "12A". Non basta prendere l'ultima parola, perche' "Via Cinque Maggio" finisce
 * con un numero scritto in lettere e "Via 4 Novembre" ne comincia con uno.
 */
function spezza(q) {
    const s = q.replace(/,?\s*milano\s*$/i, "").trim();
    const m = s.match(/^(.+?)[\s,]+(\d+)\s*[\/\s-]?\s*([a-zA-Z])?$/);
    if (!m)
        return { via: s, civico: "" };
    return { via: m[1].trim(), civico: m[3] ? `${m[2]}/${m[3].toUpperCase()}` : m[2] };
}
/**
 * Vie che corrispondono a quello che si sta scrivendo.
 *
 * Ogni parola digitata deve comparire nel nome: cosi' "savona 35" e "via savona"
 * trovano entrambi Via Savona, e "porta romana" non tira dentro tutte le vie che
 * contengono "porta". L'ordine premia chi comincia con la query — chi scrive
 * "torino" cerca Via Torino, non Via Bastioni di Torino — e a parita' mette
 * avanti le vie piu' grandi, che sono quelle piu' probabili.
 */
function suggerisci(q, max = 8) {
    const testo = normalizza(spezza(q).via);
    if (testo.length < 2)
        return [];
    const parole = testo.split(" ");
    /* Chi scrive "montenapoleone" tutto attaccato cerca Via Monte Napoleone, che
       in anagrafe e' staccata; vale anche al contrario, per chi spezza un nome
       che il Comune scrive unito. Il confronto senza spazi li riconcilia, ma solo
       dopo aver provato quello normale: non deve rubare il primo posto a una
       corrispondenza vera. */
    const compatto = testo.replace(/ /g, "");
    const trovate = [];
    for (const v of VIE) {
        const perParole = parole.every((p) => v.chiave.includes(p));
        if (!perParole && !v.chiave.replace(/ /g, "").includes(compatto))
            continue;
        let punti = 0;
        if (v.chiave.startsWith(testo))
            punti += 100;
        // "torino" deve battere "bastioni di torino": premio chi ha la query
        // all'inizio del nome proprio, cioe' subito dopo il tipo di strada.
        const senzaTipo = v.chiave.replace(/^(via privata|via|viale|piazzale|piazzetta|piazza|corso|largo|galleria|vicolo|alzaia|ripa|foro|bastioni|passaggio|strada|parco|giardino|cavalcavia|sito) /, "");
        if (senzaTipo.startsWith(parole[0]))
            punti += 50;
        punti += Math.min(v.civici, 40) / 10;
        if (!perParole)
            punti -= 200;
        trovate.push({ v, punti });
    }
    return trovate
        .sort((a, b) => b.punti - a.punti || a.v.nome.localeCompare(b.v.nome))
        .slice(0, max)
        .map((t) => t.v);
}
/**
 * Il civico esistente subito prima e subito dopo quello cercato.
 *
 * Uno per lato, non i due piu' vicini in assoluto: chi cerca il 12 in una via
 * dove i numeri saltano dal 4 al 15 deve vedere "4 e 15" e capire che il
 * portone non c'e', non "15 e 16" che sembra un errore di battitura.
 */
function accanto(lista, cercato) {
    const n = parseInt(cercato, 10);
    if (!Number.isFinite(n))
        return [];
    let prima = null, dopo = null;
    for (const c of lista) {
        const m = parseInt(c[0], 10);
        if (!Number.isFinite(m))
            continue;
        if (m < n && (prima === null || m > prima))
            prima = m;
        if (m > n && (dopo === null || m < dopo))
            dopo = m;
    }
    return [prima, dopo].filter((x) => x !== null).map(String);
}
/**
 * Da testo libero a punto sulla mappa e zona OMI.
 *
 * Quando il civico non esiste lo diciamo invece di ripiegare in silenzio sulla
 * via: su una via che attraversa piu' zone la differenza si vede nel prezzo, e
 * un utente che ha sbagliato numero merita di saperlo. Se invece la via sta
 * tutta in una zona, il civico e' irrilevante e non lo facciamo pesare.
 */
function risolvi(q) {
    const { via: testo, civico } = spezza(q);
    const chiave = normalizza(testo);
    let via = VIE.find((v) => v.chiave === chiave);
    if (!via) {
        const candidate = suggerisci(testo, 2);
        // Una sola corrispondenza netta si puo' accettare; due sono un'ambiguita'
        // e la scelta spetta a chi cerca.
        if (candidate.length === 1)
            via = candidate[0];
        else
            return { esito: "sconosciuto" };
    }
    if (!civico)
        return { esito: "via", via };
    const lista = CIVICI[via.chiave] || [];
    const trovato = lista.find((c) => c[0] === civico) ||
        // "12A" scritto senza barra, o "12/A" quando in anagrafe c'e' il 12 secco
        lista.find((c) => c[0].replace("/", "") === civico.replace("/", "")) ||
        (civico.includes("/") ? lista.find((c) => c[0] === civico.split("/")[0]) : undefined);
    if (trovato && trovato[3]) {
        return { esito: "civico", via, civico: trovato[0], lon: trovato[1], lat: trovato[2], zona: trovato[3] };
    }
    if (!via.zone)
        return { esito: "via", via };
    return { esito: "civico-assente", via, civico, vicini: accanto(lista, civico) };
}
/**
 * I civici di una via che cominciano con quello che si sta scrivendo.
 *
 * "via torino 4" deve proporre 4, 42, 43, 44… in ordine numerico, con il numero
 * esatto per primo se esiste. Se nessun civico comincia cosi' — il 40 di Via
 * Torino non c'e' — si propongono quello prima e quello dopo, e lo si dichiara:
 * `vicini` a true dice all'interfaccia di intitolare la lista di conseguenza.
 */
function suggerisciCivici(via, parziale, max = 6) {
    const lista = (CIVICI[via.chiave] || []).filter((c) => Boolean(c[3]));
    const p = parziale.toUpperCase().replace("/", "");
    const compatto = (c) => c.toUpperCase().replace("/", "");
    const num = (c) => parseInt(c, 10);
    const prefisso = lista
        .filter((c) => compatto(c[0]).startsWith(p))
        .sort((a, b) => (compatto(a[0]) === p ? -1 : compatto(b[0]) === p ? 1 : 0) || num(a[0]) - num(b[0]) || a[0].localeCompare(b[0]))
        .slice(0, max);
    const forma = (c) => ({ civico: c[0], lon: c[1], lat: c[2], zona: c[3] });
    if (prefisso.length)
        return { elenco: prefisso.map(forma), vicini: false };
    const intorno = new Set(accanto(lista, parziale));
    return { elenco: lista.filter((c) => intorno.has(c[0])).map(forma), vicini: true };
}
