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

import indice from "../../data/vie-milano.json";
import elenco from "../../data/civici-milano.json";

export type Via = {
  nome: string;
  chiave: string;
  zona: string;
  /** presente solo se la via attraversa piu' di una zona OMI */
  zone?: string[];
  civici: number;
  lon: number;
  lat: number;
  copertura: number;
};

/** [numero civico, longitudine, latitudine, zona OMI] */
type Civico = [string, number, number, string | null];

const VIE = (indice as { vie: Via[] }).vie;
export const META = (indice as any).meta as {
  fonte: string; aggiornamento: string; generato: string; vie: number; civici: number;
};
const CIVICI = (elenco as any).civici as Record<string, Civico[]>;

/** Stessa normalizzazione dello script di ingest: senza accenti ne' punteggiatura. */
export function normalizza(s: string) {
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
export function spezza(q: string) {
  const s = q.replace(/,?\s*milano\s*$/i, "").trim();
  const m = s.match(/^(.+?)[\s,]+(\d+)\s*[\/\s-]?\s*([a-zA-Z])?$/);
  if (!m) return { via: s, civico: "" };
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
export function suggerisci(q: string, max = 8): Via[] {
  const testo = normalizza(spezza(q).via);
  if (testo.length < 2) return [];
  const parole = testo.split(" ");

  /* Chi scrive "montenapoleone" tutto attaccato cerca Via Monte Napoleone, che
     in anagrafe e' staccata; vale anche al contrario, per chi spezza un nome
     che il Comune scrive unito. Il confronto senza spazi li riconcilia, ma solo
     dopo aver provato quello normale: non deve rubare il primo posto a una
     corrispondenza vera. */
  const compatto = testo.replace(/ /g, "");

  const trovate: { v: Via; punti: number }[] = [];
  for (const v of VIE) {
    const perParole = parole.every((p) => v.chiave.includes(p));
    if (!perParole && !v.chiave.replace(/ /g, "").includes(compatto)) continue;
    let punti = 0;
    if (v.chiave.startsWith(testo)) punti += 100;
    // "torino" deve battere "bastioni di torino": premio chi ha la query
    // all'inizio del nome proprio, cioe' subito dopo il tipo di strada.
    const senzaTipo = v.chiave.replace(/^(via privata|via|viale|piazzale|piazzetta|piazza|corso|largo|galleria|vicolo|alzaia|ripa|foro|bastioni|passaggio|strada|parco|giardino|cavalcavia|sito) /, "");
    if (senzaTipo.startsWith(parole[0])) punti += 50;
    punti += Math.min(v.civici, 40) / 10;
    if (!perParole) punti -= 200;
    trovate.push({ v, punti });
  }

  return trovate
    .sort((a, b) => b.punti - a.punti || a.v.nome.localeCompare(b.v.nome))
    .slice(0, max)
    .map((t) => t.v);
}

export type Risoluzione =
  | { esito: "civico"; via: Via; civico: string; lon: number; lat: number; zona: string }
  | { esito: "civico-assente"; via: Via; civico: string; vicini: string[] }
  | { esito: "via"; via: Via }
  | { esito: "sconosciuto" };

/**
 * Il civico esistente subito prima e subito dopo quello cercato.
 *
 * Uno per lato, non i due piu' vicini in assoluto: chi cerca il 12 in una via
 * dove i numeri saltano dal 4 al 15 deve vedere "4 e 15" e capire che il
 * portone non c'e', non "15 e 16" che sembra un errore di battitura.
 */
function accanto(lista: Civico[], cercato: string): string[] {
  const n = parseInt(cercato, 10);
  if (!Number.isFinite(n)) return [];
  let prima: number | null = null, dopo: number | null = null;
  for (const c of lista) {
    const m = parseInt(c[0], 10);
    if (!Number.isFinite(m)) continue;
    if (m < n && (prima === null || m > prima)) prima = m;
    if (m > n && (dopo === null || m < dopo)) dopo = m;
  }
  return [prima, dopo].filter((x): x is number => x !== null).map(String);
}

/**
 * Da testo libero a punto sulla mappa e zona OMI.
 *
 * Quando il civico non esiste lo diciamo invece di ripiegare in silenzio sulla
 * via: su una via che attraversa piu' zone la differenza si vede nel prezzo, e
 * un utente che ha sbagliato numero merita di saperlo. Se invece la via sta
 * tutta in una zona, il civico e' irrilevante e non lo facciamo pesare.
 */
export function risolvi(q: string): Risoluzione {
  const { via: testo, civico } = spezza(q);
  const chiave = normalizza(testo);

  let via = VIE.find((v) => v.chiave === chiave);
  if (!via) {
    const candidate = suggerisci(testo, 2);
    // Una sola corrispondenza netta si puo' accettare; due sono un'ambiguita'
    // e la scelta spetta a chi cerca.
    if (candidate.length === 1) via = candidate[0];
    else return { esito: "sconosciuto" };
  }

  if (!civico) return { esito: "via", via };

  const lista = CIVICI[via.chiave] || [];
  const trovato =
    lista.find((c) => c[0] === civico) ||
    // "12A" scritto senza barra, o "12/A" quando in anagrafe c'e' il 12 secco
    lista.find((c) => c[0].replace("/", "") === civico.replace("/", "")) ||
    (civico.includes("/") ? lista.find((c) => c[0] === civico.split("/")[0]) : undefined);

  if (trovato && trovato[3]) {
    return { esito: "civico", via, civico: trovato[0], lon: trovato[1], lat: trovato[2], zona: trovato[3] };
  }
  if (!via.zone) return { esito: "via", via };
  return { esito: "civico-assente", via, civico, vicini: accanto(lista, civico) };
}

export type CivicoSuggerito = { civico: string; lon: number; lat: number; zona: string };

/**
 * I civici di una via che cominciano con quello che si sta scrivendo.
 *
 * "via torino 4" deve proporre 4, 42, 43, 44… in ordine numerico, con il numero
 * esatto per primo se esiste. Se nessun civico comincia cosi' — il 40 di Via
 * Torino non c'e' — si propongono quello prima e quello dopo, e lo si dichiara:
 * `vicini` a true dice all'interfaccia di intitolare la lista di conseguenza.
 */
export function suggerisciCivici(via: Via, parziale: string, max = 6): { elenco: CivicoSuggerito[]; vicini: boolean } {
  const lista = (CIVICI[via.chiave] || []).filter((c): c is [string, number, number, string] => Boolean(c[3]));
  const p = parziale.toUpperCase().replace("/", "");
  const compatto = (c: string) => c.toUpperCase().replace("/", "");
  const num = (c: string) => parseInt(c, 10);

  const prefisso = lista
    .filter((c) => compatto(c[0]).startsWith(p))
    .sort((a, b) => (compatto(a[0]) === p ? -1 : compatto(b[0]) === p ? 1 : 0) || num(a[0]) - num(b[0]) || a[0].localeCompare(b[0]))
    .slice(0, max);

  const forma = (c: [string, number, number, string]): CivicoSuggerito => ({ civico: c[0], lon: c[1], lat: c[2], zona: c[3] });
  if (prefisso.length) return { elenco: prefisso.map(forma), vicini: false };

  const intorno = new Set(accanto(lista, parziale));
  return { elenco: lista.filter((c) => intorno.has(c[0])).map(forma), vicini: true };
}
