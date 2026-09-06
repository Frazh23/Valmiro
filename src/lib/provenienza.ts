import type { Input } from "./types";

/** Provenienza dei dati. La versione 2 annota le ipotesi senza bloccare il calcolo.
 * Le vecchie simulazioni conservano la semantica originaria. */
export type Provenienza = "annuncio" | "utente" | "ipotesi" | "sconosciuto";
export type Campo = "mq" | "stato" | "piano" | "ascensore" | "classe" | "pertinenze" | "box" | "mqBalconi" | "mqTerrazzi" | "cantina" | "superficie" | "pertinenzeIncluse" | "tipo" | "luce" | "epoca" | "affaccio" | "metro";
export type Provenienze = Partial<Record<Campo, Provenienza>>;

export const CAMPI: readonly Campo[] = ["mq", "stato", "piano", "ascensore", "classe", "pertinenze", "box", "mqBalconi", "mqTerrazzi", "cantina", "superficie", "pertinenzeIncluse", "tipo", "luce", "epoca", "affaccio", "metro"];
/** i campi che, non confermati, impediscono una valutazione */
export const MATERIALI: readonly Campo[] = ["mq", "stato", "piano", "ascensore"];

export const NOME_CAMPO: Record<Campo, string> = {
  mq: "superficie", stato: "stato conservativo", piano: "piano", ascensore: "ascensore",
  mqBalconi: "balconi", mqTerrazzi: "terrazzi", cantina: "cantina", superficie: "tipo di superficie", pertinenzeIncluse: "pertinenze nella superficie", tipo: "tipologia", luce: "luminosità", epoca: "epoca", affaccio: "affaccio", metro: "metropolitana",
  classe: "classe energetica", pertinenze: "balconi, terrazzi e cantina", box: "box o posto auto",
};

const STATO_NOME = { rist: "da ristrutturare", abit: "abitabile", otti: "ottimo stato", nuov: "nuova" } as const;

/** Il valore di un campo, in parole, per elencarlo fra le ipotesi. */
export function valoreInParole(i: Input, c: Campo): string {
  switch (c) {
    case "mqBalconi": return `${i.mqBalconi || 0} mq`;
    case "mqTerrazzi": return `${i.mqTerrazzi || 0} mq`;
    case "cantina": return i.cantina ? "presente" : "assente";
    case "superficie": return i.superficie || "commerciale";
    case "pertinenzeIncluse": return i.pertinenzeIncluse === false ? "escluse" : "incluse";
    case "tipo": return ({civ: "civile", sig: "signorile", eco: "economico", vil: "ville e villini"})[i.tipo];
    case "luce": return i.luce || "media";
    case "epoca": case "affaccio": case "metro": return i[c] || "non indicato, nessun aggiustamento";
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

export function provenienzaIniziale(): Provenienze {
  return Object.fromEntries(CAMPI.filter(c => c !== "pertinenze").map(c => [c, "ipotesi"])) as Provenienze;
}
export function modificaUtente(i: Input, patch: Partial<Input>): Input {
  const provenienza = { ...i.provenienza };
  for (const c of CAMPI) if (c !== "pertinenze" && Object.hasOwn(patch, c)) provenienza[c] = "utente";
  return { ...i, ...patch, provenienza, versioneProvenienza: 2, origineDatiParziale: i.origineDatiParziale || !i.provenienza };
}
export function noteIpotesi(i: Input): string[] {
  return ipotesiDi(i).filter(x => x.campo !== "pertinenze" && !["epoca", "affaccio", "metro"].includes(x.campo))
    .map(x => `${NOME_CAMPO[x.campo]}: ${valoreInParole(i, x.campo)}`);
}
