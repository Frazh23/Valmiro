import type { Input } from "./types";

/* --------------------------------------------------------------------------
   Da dove viene ogni dato del modulo.

   Un valore nel modulo puo' essere quattro cose diverse, e il risultato deve
   saperlo: dichiarato dall'annuncio («annuncio»), confermato o inserito da chi
   valuta («utente»), un predefinito che nessuno ha confermato («ipotesi»), o un
   «non lo so» esplicito («sconosciuto»), che per il motore e' comunque un'ipotesi
   perche' il calcolo usa un valore.

   I campi MATERIALI muovono il valore in modo sensibile. Finche' uno di loro e'
   un'ipotesi non confermata, il motore non stima: si puo' solo chiedere una
   «simulazione con dati incompleti», che elenca le ipotesi accanto al numero e
   non da' giudizi, offerte ne' prezzi di pubblicazione. La classe energetica
   «non la conosco» non e' un'ipotesi: il motore non applica nessun aggiustamento,
   e lo scrive. Pertinenze e box, ai predefiniti, non spostano il valore: si
   elencano fra le ipotesi ma non bloccano.

   Un modulo senza `provenienza` e' trattato come tutto confermato.

   Dal 6 settembre 2026 **il modulo del sito non compila piu' questo campo**: le
   conferme campo per campo sono state tolte e la stima parte con i predefiniti,
   che il riepilogo della lettura elenca. Il meccanismo resta qui, e nel motore,
   per due ragioni: le chiamate diritte a /api/estimate possono ancora dichiarare
   la provenienza dei dati, e le stime salvate prima di quella data riaperte
   mostrano ancora gli avvisi con cui erano nate.
   -------------------------------------------------------------------------- */

export type Provenienza = "annuncio" | "utente" | "ipotesi" | "sconosciuto";
export type Campo = "mq" | "stato" | "piano" | "ascensore" | "classe" | "pertinenze" | "box";
export type Provenienze = Partial<Record<Campo, Provenienza>>;

export const CAMPI: readonly Campo[] = ["mq", "stato", "piano", "ascensore", "classe", "pertinenze", "box"];
/** i campi che, non confermati, impediscono una valutazione */
export const MATERIALI: readonly Campo[] = ["mq", "stato", "piano", "ascensore"];

export const NOME_CAMPO: Record<Campo, string> = {
  mq: "superficie", stato: "stato conservativo", piano: "piano", ascensore: "ascensore",
  classe: "classe energetica", pertinenze: "balconi, terrazzi e cantina", box: "box o posto auto",
};

const STATO_NOME = { rist: "da ristrutturare", abit: "abitabile", otti: "ottimo stato", nuov: "nuova" } as const;

/** Il valore di un campo, in parole, per elencarlo fra le ipotesi. */
export function valoreInParole(i: Input, c: Campo): string {
  switch (c) {
    case "mq": return `${i.mq || "—"} mq`;
    case "stato": return STATO_NOME[i.stato];
    case "piano": return i.pianoDichiarato ?? i.piano;
    case "ascensore": return i.ascensore ? "con ascensore" : "senza ascensore";
    case "classe": return i.classe === "nd" ? "non nota" : i.classe;
    case "pertinenze": return i.pertinenzeIncluse === false || i.superficie === "calpestabile"
      ? `balconi ${i.mqBalconi || 0} mq, terrazzi ${i.mqTerrazzi || 0} mq, cantina ${i.cantina ? "sì" : "no"}`
      : "comprese nella superficie";
    case "box": return i.box === "box" ? "box" : i.box === "posto" ? "posto auto" : "nessuno";
  }
}

export type Ipotesi = { campo: Campo; valore: string; provenienza: "ipotesi" | "sconosciuto"; materiale: boolean };

/** Tutte le ipotesi in uso: predefiniti non confermati e «non lo so», materiali o no. */
export function ipotesiDi(i: Input): Ipotesi[] {
  const p = i.provenienza;
  if (!p) return [];
  return CAMPI.filter((c) => p[c] === "ipotesi" || p[c] === "sconosciuto").map((c) => ({
    campo: c, valore: valoreInParole(i, c), provenienza: p[c] as "ipotesi" | "sconosciuto", materiale: MATERIALI.includes(c),
  }));
}

export const ipotesiMateriali = (i: Input) => ipotesiDi(i).filter((x) => x.materiale);

/** Un'ipotesi in una riga: «stato conservativo: abitabile — predefinito, non confermato». */
export const descriviIpotesi = (x: Ipotesi) =>
  `${NOME_CAMPO[x.campo]}: ${x.valore} — ${x.provenienza === "sconosciuto" ? "non lo sai, il calcolo usa questo valore" : "predefinito, non confermato"}`;

/** Il messaggio con cui il motore rifiuta di stimare su ipotesi materiali. */
export const DATI_NON_CONFERMATI = (ip: Ipotesi[]) =>
  `Mancano conferme su ${ip.map((x) => NOME_CAMPO[x.campo]).join(", ")}: con dati predefiniti non confermati non c'è una valutazione. Conferma i valori, oppure chiedi una simulazione con dati incompleti, che elenca le ipotesi e non dà giudizi sul prezzo.`;
