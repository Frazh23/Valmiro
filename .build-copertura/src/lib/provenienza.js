"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATI_NON_CONFERMATI = exports.descriviIpotesi = exports.ipotesiMateriali = exports.NOME_CAMPO = exports.MATERIALI = exports.CAMPI = void 0;
exports.valoreInParole = valoreInParole;
exports.ipotesiDi = ipotesiDi;
exports.provenienzaIniziale = provenienzaIniziale;
exports.modificaUtente = modificaUtente;
exports.noteIpotesi = noteIpotesi;
exports.CAMPI = ["mq", "stato", "piano", "ascensore", "classe", "pertinenze", "box", "mqBalconi", "mqTerrazzi", "cantina", "superficie", "pertinenzeIncluse", "tipo", "luce", "epoca", "affaccio", "metro"];
/** i campi che, non confermati, impediscono una valutazione */
exports.MATERIALI = ["mq", "stato", "piano", "ascensore"];
exports.NOME_CAMPO = {
    mq: "superficie", stato: "stato conservativo", piano: "piano", ascensore: "ascensore",
    mqBalconi: "balconi", mqTerrazzi: "terrazzi", cantina: "cantina", superficie: "tipo di superficie", pertinenzeIncluse: "pertinenze nella superficie", tipo: "tipologia", luce: "luminosità", epoca: "epoca", affaccio: "affaccio", metro: "metropolitana",
    classe: "classe energetica", pertinenze: "balconi, terrazzi e cantina", box: "box o posto auto",
};
const STATO_NOME = { rist: "da ristrutturare", abit: "abitabile", otti: "ottimo stato", nuov: "nuova" };
/** Il valore di un campo, in parole, per elencarlo fra le ipotesi. */
function valoreInParole(i, c) {
    switch (c) {
        case "mqBalconi": return `${i.mqBalconi || 0} mq`;
        case "mqTerrazzi": return `${i.mqTerrazzi || 0} mq`;
        case "cantina": return i.cantina ? "presente" : "assente";
        case "superficie": return i.superficie || "commerciale";
        case "pertinenzeIncluse": return i.pertinenzeIncluse === false ? "escluse" : "incluse";
        case "tipo": return ({ civ: "civile", sig: "signorile", eco: "economico", vil: "ville e villini" })[i.tipo];
        case "luce": return i.luce || "media";
        case "epoca":
        case "affaccio":
        case "metro": return i[c] || "non indicato, nessun aggiustamento";
        case "mq": return `${i.mq || "—"} mq`;
        case "stato": return STATO_NOME[i.stato];
        case "piano": return i.pianoDichiarato ?? i.piano;
        case "ascensore": return i.ascensore ? "con ascensore" : "senza ascensore";
        case "classe": return i.classe === "nd" ? "non nota, nessun aggiustamento" : i.classe;
        case "pertinenze": return i.pertinenzeIncluse === false || i.superficie === "calpestabile"
            ? `balconi ${i.mqBalconi || 0} mq, terrazzi ${i.mqTerrazzi || 0} mq, cantina ${i.cantina ? "sì" : "no"}`
            : "comprese nella superficie";
        case "box": return i.box === "box" ? "box" : i.box === "posto" ? "posto auto" : "nessuno";
    }
}
/** Tutte le ipotesi in uso: predefiniti non confermati e «non lo so», materiali o no. */
function ipotesiDi(i) {
    const p = i.provenienza;
    if (!p)
        return [];
    return exports.CAMPI.filter((c) => p[c] === "ipotesi" || p[c] === "sconosciuto").map((c) => ({
        campo: c, valore: valoreInParole(i, c), provenienza: p[c], materiale: exports.MATERIALI.includes(c),
    }));
}
const ipotesiMateriali = (i) => ipotesiDi(i).filter((x) => x.materiale);
exports.ipotesiMateriali = ipotesiMateriali;
/** Un'ipotesi in una riga: «stato conservativo: abitabile — predefinito, non confermato». */
const descriviIpotesi = (x) => `${exports.NOME_CAMPO[x.campo]}: ${x.valore} — ${x.provenienza === "sconosciuto" ? "non lo sai, il calcolo usa questo valore" : "predefinito, non confermato"}`;
exports.descriviIpotesi = descriviIpotesi;
/** Il messaggio con cui il motore rifiuta di stimare su ipotesi materiali. */
const DATI_NON_CONFERMATI = (ip) => `Mancano conferme su ${ip.map((x) => exports.NOME_CAMPO[x.campo]).join(", ")}: con dati predefiniti non confermati non c'è una valutazione. Conferma i valori, oppure chiedi una simulazione con dati incompleti, che elenca le ipotesi e non dà giudizi sul prezzo.`;
exports.DATI_NON_CONFERMATI = DATI_NON_CONFERMATI;
function provenienzaIniziale() {
    return Object.fromEntries(exports.CAMPI.filter(c => c !== "pertinenze").map(c => [c, "ipotesi"]));
}
function modificaUtente(i, patch) {
    const provenienza = { ...i.provenienza };
    for (const c of exports.CAMPI)
        if (c !== "pertinenze" && Object.hasOwn(patch, c))
            provenienza[c] = "utente";
    return { ...i, ...patch, provenienza, versioneProvenienza: 2, origineDatiParziale: i.origineDatiParziale || !i.provenienza };
}
function noteIpotesi(i) {
    return ipotesiDi(i).filter(x => x.campo !== "pertinenze" && !["epoca", "affaccio", "metro"].includes(x.campo))
        .map(x => `${exports.NOME_CAMPO[x.campo]}: ${valoreInParole(i, x.campo)}`);
}
