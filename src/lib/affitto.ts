import locazioniJson from "../../data/locazioni-omi-2024-2.json";
import storicoJson from "../../data/omi-storico.json";
import { ZONE } from "./data";
import { PARAMETRI, COMPRESSIONE_STATO } from "./engine";
import type { FasceOmi, Input, Stato, Stima, Tipo } from "./types";

/* --------------------------------------------------------------------------
   Rendita da locazione e andamento della zona.

   L'OMI pubblica, accanto ai prezzi, i canoni di locazione in euro al mq al
   mese, per le stesse zone, tipologie e stati. Sono un dato ufficiale, non
   una stima nostra: qui li si porta sull'immobile con la stessa logica del
   prezzo, senza inventare un secondo motore.

   Niente qui tocca la stima del valore: engine.ts resta l'unica fonte del
   prezzo. Questo modulo legge la stima e la traduce in canone.
   -------------------------------------------------------------------------- */

export const LOCAZIONI = locazioniJson as unknown as Record<string, Record<Tipo, FasceOmi>>;
export const SEMESTRE_LOCAZIONI = "2024 · 2° semestre";

type Serie = { s: string; c: [number, number]; l: [number, number] }[];
type StoricoZona = { dal: string; stato: "NORMALE" | "OTTIMO"; serie: Serie };
export const STORICO = (storicoJson as unknown as { meta: { dal: string }; zone: Record<string, StoricoZona> }).zone;

/** Tassazione del canone libero: cedolare secca ordinaria. */
export const FISCO_AFFITTO = {
  cedolare: 0.21,
  /** un mese all'anno fra un inquilino e l'altro: prudente, dichiarato */
  mesiSfitto: 1,
};

/** Canone al mq al mese per stato, ancorato alle mediane OMI come il prezzo. */
export function canoneBase(zona: string, tipo: Tipo, stato: Stato) {
  const z = LOCAZIONI[zona];
  if (!z) return null;
  let t = z[tipo];
  const ripiego = !t || !Object.keys(t).length;
  if (ripiego) t = z.civ;
  const N = t.NORMALE, O = t.OTTIMO;
  if (!N && !O) return null;
  const mediaN = N ? (N[0] + N[1]) / 2 : O![0] * 0.85;
  const mediaO = O ? (O[0] + O[1]) / 2 : N![1] * 1.15;
  /* Lo stesso premio compresso del prezzo: la taratura ha misurato che il
     mercato paga lo stato meno di quanto la forbice OMI suggerisca, e non c'e'
     motivo di credere che l'affitto faccia diversamente. */
  const f = (ZONE[zona]?.f as string) || "D";
  const premio = Math.pow(mediaO / mediaN, PARAMETRI.compressioneStato[f] ?? COMPRESSIONE_STATO);
  const mq =
    stato === "rist" ? mediaN * PARAMETRI.scontoRist
    : stato === "abit" ? mediaN
    : stato === "otti" ? mediaN * premio
    : mediaN * premio * 1.06;
  return { euroMqMese: mq, ripiego, banda: [N?.[0] ?? O![0], O?.[1] ?? N![1]] as [number, number] };
}

export type Rendita = {
  canoneMese: number;
  euroMqMese: number;
  annuoLordo: number;
  lordo: number;          // rendimento lordo sul valore centrale
  annuoNetto: number;     // dopo cedolare e sfitto, IMU esclusa
  netto: number;
  anniRipago: number;
  ripiego: boolean;
  banda: [number, number];
};

/**
 * Dal valore stimato al canone: le stesse caratteristiche che spostano il
 * prezzo rispetto alla base OMI (piano, ascensore, classe, luce) spostano il
 * canone rispetto alla base dei canoni, nella stessa proporzione.
 */
export function rendita(i: Input, stima: Stima): Rendita | null {
  const base = canoneBase(i.zona, i.tipo, i.stato);
  if (!base) return null;
  const fattore = stima.baseOmi > 0 ? stima.euroMq / stima.baseOmi : 1;
  const euroMqMese = base.euroMqMese * fattore;
  const canoneMese = Math.round((euroMqMese * stima.superficieCommerciale) / 10) * 10;
  const annuoLordo = canoneMese * 12;
  const annuoNetto = annuoLordo * ((12 - FISCO_AFFITTO.mesiSfitto) / 12) * (1 - FISCO_AFFITTO.cedolare);
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
export const semestreBreve = (s: string) => `${s.slice(5)}° sem. ${s.slice(0, 4)}`;
export const annoDi = (s: string) => s.slice(0, 4);

export type Andamento = {
  dal: string;
  stato: "NORMALE" | "OTTIMO";
  punti: { s: string; prezzo: number; canone: number }[];
  /** variazione del prezzo dal primo al piu' recente semestre disponibile */
  variazione: number;
  /** variazione del prezzo negli ultimi due anni (quattro semestri) */
  variazione2anni: number | null;
  variazioneCanone: number;
  /** rendimento lordo grezzo di zona: canone annuo / prezzo, mediane OMI */
  rendimentoZona: number;
  nuova: boolean;
};

/** L'andamento della zona, prezzi e canoni mediani OMI, semestre per semestre. */
export function andamento(zona: string): Andamento | null {
  const z = STORICO[zona];
  if (!z || !z.serie.length) return null;
  const punti = z.serie.map((p) => ({ s: p.s, prezzo: (p.c[0] + p.c[1]) / 2, canone: (p.l[0] + p.l[1]) / 2 }));
  const primo = punti[0], ultimo = punti[punti.length - 1];
  const dueAnni = punti.length > 4 ? punti[punti.length - 5] : null;
  return {
    dal: z.dal, stato: z.stato, punti,
    variazione: ultimo.prezzo / primo.prezzo - 1,
    variazione2anni: dueAnni ? ultimo.prezzo / dueAnni.prezzo - 1 : null,
    variazioneCanone: ultimo.canone / primo.canone - 1,
    rendimentoZona: (ultimo.canone * 12) / ultimo.prezzo,
    nuova: punti.length < 4,
  };
}

/* --------------------------------------------------------------------------
   Affitto breve: uno scenario, non un dato.

   Non esiste una fonte ufficiale per le tariffe a notte. Le ipotesi qui sotto
   vengono da fonti di settore su Milano (AirDNA via iltuopropertymanager.it,
   luglio 2026; Home2Home, luglio 2026; Verto AI, aprile 2026): tariffa media
   150-160 euro a notte sul mercato, 120 prudente per un bilocale; occupazione
   55-65%; commissioni 12-18%; pulizie ~55 euro a cambio; utenze e condominio
   a carico del proprietario; cedolare 21%, 26% dal secondo immobile;
   property manager 20-25%. Sono regolabili dalla pagina, e la pagina dice che
   sono ipotesi. Il profilo di partenza e' prudente, scelta di Francesco.
   -------------------------------------------------------------------------- */

export type IpotesiBreve = {
  tariffa: number;       // euro a notte
  occupazione: number;   // 0..1
  commissioni: number;   // quota del lordo alle piattaforme
  pulizie: number;       // euro a cambio
  soggiorno: number;     // notti medie per prenotazione
  utenze: number;        // euro al mese, luce gas acqua internet condominio
  gestione: number;      // quota del lordo al property manager, 0 se in proprio
  cedolare: number;      // 0.21, 0.26 dal secondo immobile
};

export const IPOTESI_BREVE_BASE: Omit<IpotesiBreve, "tariffa"> = {
  occupazione: 0.55, commissioni: 0.15, pulizie: 55, soggiorno: 3, utenze: 200, gestione: 0, cedolare: 0.21,
};

/** Tariffa prudente: ancorata al canone mensile della zona, non al mercato turistico. */
export function tariffaPrudente(canoneMese: number) {
  return Math.max(60, Math.round(canoneMese / 9 / 5) * 5);
}

export type Breve = {
  notti: number; lordo: number; commissioni: number; pulizie: number; utenze: number; gestione: number;
  cedolare: number; netto: number; rendimentoNetto: number;
  /** occupazione a cui l'affitto breve rende quanto il 4+4, o null se non la raggiunge mai */
  pareggio: number | null;
  /** quanto rende in piu' (o in meno) del 4+4, in euro l'anno */
  differenza: number;
};

export function affittoBreve(ip: IpotesiBreve, lungo: Rendita, stima: Stima): Breve {
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
