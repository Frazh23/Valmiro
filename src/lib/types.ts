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
  dettaglio: Voce[];
  semestre: string;
  fonte: string;
};

/** Un indirizzo risolto in una zona OMI. `preciso` distingue il geocoder dal dizionario. */
export type Scelta = { zona: string; etichetta: string; descrizione: string; preciso: boolean };
