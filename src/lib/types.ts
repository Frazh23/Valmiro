export type Fascia = "B" | "C" | "D" | "E" | "R";
export type Stato = "rist" | "abit" | "otti" | "nuov";
export type Tipo = "civ" | "sig" | "eco" | "vil";
export type Piano = "terra" | "rialzato" | "1-2" | "3-5" | "6+" | "ultimo";
export type Classe = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/** Le due fasce che l'OMI pubblica per ogni tipologia: stato NORMALE e stato OTTIMO. */
export type FasceOmi = { NORMALE?: [number, number]; OTTIMO?: [number, number] };

export type Zona = {
  /** descrizione ufficiale della zona */
  d: string;
  f: Fascia;
  civ: FasceOmi;
  sig: FasceOmi;
  eco: FasceOmi;
  vil: FasceOmi;
  /** quotazione box, euro al mq */
  box: [number, number] | null;
};

export type Input = {
  zona: string;
  tipo: Tipo;
  /** categoria catastale dichiarata dall'utente (A/2, A/3...): da qui deriva `tipo`. Solo informativa per il motore. */
  categoria?: string | null;
  mq: number;
  balconi?: number;
  cantina?: boolean;
  box?: "nessuno" | "posto" | "box";
  stato: Stato;
  piano: Piano;
  ascensore: boolean;
  classe: Classe;
  luce?: "scarsa" | "media" | "ottima";
  epoca?: "ante1945" | "1946-1980" | "1981-2005" | "post2005" | null;
  affaccio?: "interno" | "misto" | "strada" | null;
  metro?: "vicina" | "media" | "lontana" | null;
};

export type Voce = { voce: string; effetto: number; euro: number };

export type Stima = {
  min: number;
  max: number;
  centro: number;
  /** prezzo a cui pubblicare l'annuncio, lascia margine di trattativa */
  pubblica: number;
  /** offerta difendibile per chi compra */
  offerta: number;
  euroMq: number;
  superficieCommerciale: number;
  baseOmi: number;
  sigma: number;
  affidabilita: "Alta" | "Media" | "Bassa";
  /** presente quando il modello sa di essere debole (oggi: segmento di pregio) */
  avvertenza?: string;
  dettaglio: Voce[];
  semestre: string;
  fonte: string;
};

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
export const FONTI = ["anagrafe", "civico", "via", "dizionario"] as const;
export type FonteIndirizzo = (typeof FONTI)[number];
export type Scelta = {
  zona: string; etichetta: string; descrizione: string;
  fonte: FonteIndirizzo;
  /** comodita': vero solo quando il civico e' stato trovato davvero */
  preciso: boolean;
};
