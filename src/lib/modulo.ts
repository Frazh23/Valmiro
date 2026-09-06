import type { Input, Piano } from "./types";
import type { Letto } from "./annuncio";
import { NOME_CAMPO, provenienzaIniziale, CAMPI, type Campo } from "./provenienza";
export { NOME_CAMPO };
/** @deprecated il nome storico: oggi e' `Campo` in provenienza.ts */
export type CampoConfermabile = Campo;

/* --------------------------------------------------------------------------
   Il modulo della casa: come nasce e come lo si riempie da un annuncio.

   Due gesti diversi, con due esiti diversi:
   - «Importa un nuovo immobile»: il modulo riparte da zero. Niente di quello che
     c'era prima — caratteristiche, pertinenze, box a parte, prezzi, avvisi —
     sopravvive. Cio' che il nuovo annuncio non dice resta al valore predefinito,
     e il riepilogo della lettura dice quali campi sono: si controllano lì.
   - «Aggiorna questo immobile»: si parte dal modulo com'e' e si cambia solo
     cio' che il testo dichiara. Ogni cambiamento viene elencato, cosi' si vede.
   L'indirizzo non decide niente: due case allo stesso indirizzo sono due case,
   e la stessa casa riletta da un altro portale e' la stessa. Decide chi legge.

   Modulo puro, senza React: cosi' i test lo coprono direttamente.
   -------------------------------------------------------------------------- */

export const INPUT_INIZIALE: Input = {
  versioneProvenienza: 2, provenienza: provenienzaIniziale(),
  zona: "", tipo: "civ", categoria: null, mq: 0, superficie: "commerciale", pertinenzeIncluse: true,
  mqBalconi: 0, mqTerrazzi: 0, cantina: false, box: "nessuno", boxSeparato: null,
  stato: "abit", piano: "1-2", pianoDichiarato: null, simulazionePiano: false, ascensore: true, classe: "nd", luce: "media",
  epoca: null, affaccio: null, metro: null, prezzoRichiesto: null,
};

export type ModoImport = "nuovo" | "aggiorna";

export type Applicazione = {
  input: Input;
  /** campi che il testo non dichiara e che nel modulo stanno al valore predefinito (la classe compresa, per l'avviso) */
  daConfermare: Campo[];
  /** solo in aggiornamento: che cosa e' cambiato, in parole */
  modifiche: string[];
  /** gli avvisi del testo appena letto, non quelli del precedente */
  avvisi: string[];
};

const STATO_NOME = { rist: "da ristrutturare", abit: "abitabile", otti: "ottimo stato", nuov: "nuova" } as const;
const BOX_NOME = { nessuno: "nessuno", posto: "posto auto", box: "box" } as const;

/** Che cosa il testo dichiara, tradotto nei campi del modulo. Solo cio' che c'e'. */
function dichiarato(r: Letto): Partial<Input> {
  const d: Partial<Input> = {};
  if (r.mq) { d.mq = r.mq; d.superficie = "commerciale"; d.pertinenzeIncluse = true; }
  if (r.pianoNonSupportato) {
    /* il piano vero resta scritto; «terra» e' solo il parametro che una simulazione userebbe */
    d.pianoDichiarato = r.pianoNonSupportato === "seminterrato" ? "seminterrato" : "interrato";
    d.piano = "terra";
    d.simulazionePiano = false;
  } else if (r.piano) { d.piano = r.piano as Piano; d.pianoDichiarato = null; d.simulazionePiano = false; }
  if (r.ascensore !== undefined) d.ascensore = r.ascensore;
  if (r.stato) d.stato = r.stato;
  if (r.classe) d.classe = r.classe;
  /* i metri delle pertinenze solo se scritti; un'assenza dichiarata azzera; il silenzio non tocca */
  if (r.mqBalconi) d.mqBalconi = r.mqBalconi; else if (r.presenze.balcone === "no") d.mqBalconi = 0;
  if (r.mqTerrazzi) d.mqTerrazzi = r.mqTerrazzi; else if (r.presenze.terrazzo === "no") d.mqTerrazzi = 0;
  if (r.presenze.cantina !== "?") d.cantina = r.presenze.cantina === "si";
  if (r.box) d.box = r.box;
  if (r.boxSeparato) d.boxSeparato = { prezzo: r.boxSeparato.prezzo, incluso: false };
  else if (r.presenze.box !== "?") d.boxSeparato = null;
  if (r.prezzo) d.prezzoRichiesto = r.prezzo;
  return d;
}

/** I campi di cui il testo non dice niente: nel modulo restano al predefinito. */
function nonDichiarati(r: Letto): Campo[] {
  const out: Campo[] = [];
  if (!r.mq) out.push("mq");
  if (!r.stato) out.push("stato");
  if (!r.piano && !r.pianoNonSupportato) out.push("piano");
  if (r.ascensore === undefined) out.push("ascensore");
  if (!r.classe) out.push("classe");
  if (r.presenze.balcone === "?" || r.presenze.terrazzo === "?" || r.presenze.cantina === "?") out.push("pertinenze");
  if (r.presenze.box === "?") out.push("box");
  return out;
}

const eur = (n: number | null | undefined) => (n ? `${n.toLocaleString("it-IT")} €` : "—");
const piano = (i: Input) => i.pianoDichiarato ?? i.piano;
const boxSep = (i: Input) => (i.boxSeparato ? `a parte${i.boxSeparato.prezzo ? `, ${eur(i.boxSeparato.prezzo)}` : ", prezzo non indicato"}` : null);

/** Le differenze fra due moduli, in parole, per farle vedere a chi aggiorna. */
export function differenze(prima: Input, dopo: Input): string[] {
  const m: string[] = [];
  const cambia = (nome: string, a: string, b: string) => { if (a !== b) m.push(`${nome}: ${a} → ${b}`); };
  cambia("superficie", `${prima.mq || "—"} mq`, `${dopo.mq || "—"} mq`);
  cambia("stato", STATO_NOME[prima.stato], STATO_NOME[dopo.stato]);
  cambia("piano", piano(prima), piano(dopo));
  cambia("ascensore", prima.ascensore ? "sì" : "no", dopo.ascensore ? "sì" : "no");
  cambia("classe", prima.classe === "nd" ? "non nota" : prima.classe, dopo.classe === "nd" ? "non nota" : dopo.classe);
  cambia("balconi", `${prima.mqBalconi || 0} mq`, `${dopo.mqBalconi || 0} mq`);
  cambia("terrazzi", `${prima.mqTerrazzi || 0} mq`, `${dopo.mqTerrazzi || 0} mq`);
  cambia("cantina", prima.cantina ? "sì" : "no", dopo.cantina ? "sì" : "no");
  cambia("box", BOX_NOME[prima.box || "nessuno"], BOX_NOME[dopo.box || "nessuno"]);
  cambia("box a parte", boxSep(prima) ?? "nessuno", boxSep(dopo) ?? "nessuno");
  cambia("prezzo", eur(prima.prezzoRichiesto), eur(dopo.prezzoRichiesto));
  return m;
}

/**
 * Applica un testo letto al modulo.
 * @param base   il modulo com'e' ora
 * @param r      il testo letto da leggiAnnuncio
 * @param modo   "nuovo": si riparte da zero, tenendo solo l'intento;
 *               "aggiorna": si cambia solo cio' che il testo dichiara
 */
export function applicaLettura(base: Input, r: Letto, modo: ModoImport): Applicazione {
  const d = dichiarato(r);
  const provenienza = modo === "nuovo" ? provenienzaIniziale() : { ...base.provenienza };
  for (const c of CAMPI) if (c !== "pertinenze" && Object.hasOwn(d, c)) provenienza[c] = "annuncio";
  // La commerciale e l'inclusione delle pertinenze sono convenzioni del lettore, non dati riconosciuti.
  if (r.mq) { provenienza.superficie = "ipotesi"; provenienza.pertinenzeIncluse = "ipotesi"; }

  if (modo === "nuovo") {
    const input: Input = { ...INPUT_INIZIALE, intento: base.intento, ...d, provenienza, versioneProvenienza: 2 };
    return { input, daConfermare: nonDichiarati(r), modifiche: [], avvisi: [...r.avvisi] };
  }
  const input: Input = { ...base, ...d, provenienza, versioneProvenienza: 2 };
  /* includere il box a parte e' una scelta di chi legge, non un dato del testo: se il nuovo
     testo offre ancora il box a parte, la scelta resta; se non lo offre piu', cade con lui */
  if (d.boxSeparato && base.boxSeparato?.incluso) { input.boxSeparato = { ...d.boxSeparato, incluso: true }; input.box = "box"; input.provenienza = { ...provenienza, box: base.provenienza?.box || "utente" }; }
  return { input, daConfermare: [], modifiche: differenze(base, input), avvisi: [...r.avvisi] };
}
