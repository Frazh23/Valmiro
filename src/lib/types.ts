export type Fascia = "B" | "C" | "D" | "E" | "R";
export type Stato = "rist" | "abit" | "otti" | "nuov";
export type Tipo = "civ" | "sig" | "eco" | "vil";
import type { Provenienze } from "./provenienza";

export type Piano = "terra" | "rialzato" | "1-2" | "3-5" | "6+" | "ultimo";
/** Piani che esistono ma per cui il modello non ha un trattamento validato: niente coefficiente, niente stima. */
export type PianoNonQuotato = "seminterrato" | "interrato";
export const PIANI_NON_QUOTATI: readonly PianoNonQuotato[] = ["seminterrato", "interrato"];
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

/** Perche' si sta valutando: cambia il linguaggio e gli strumenti, mai il valore. */
export type Intento = "compro" | "vendo";

export type Input = {
  zona: string;
  tipo: Tipo;
  /** categoria catastale dichiarata dall'utente (A/2, A/3...): da qui deriva `tipo`. Solo informativa per il motore. */
  categoria?: string | null;
  /** chi compra: il prezzo richiesto nell'annuncio; chi vende: il prezzo che aveva in mente. Solo per il confronto. */
  prezzoRichiesto?: number | null;
  /** solo informativo per il motore: la stima e' la stessa nei due percorsi */
  intento?: Intento;
  /** metri quadri come li ha inseriti chi valuta, nel senso di `superficie` */
  mq: number;
  /** "commerciale": la superficie degli annunci e degli atti, muri compresi (predefinita);
      "calpestabile": la superficie interna netta, che il motore porta a commerciale */
  superficie?: "commerciale" | "calpestabile";
  /** vero se balconi, terrazzi e cantina sono gia' dentro la superficie commerciale inserita */
  pertinenzeIncluse?: boolean;
  /** superficie dei balconi, in metri quadri */
  mqBalconi?: number;
  /** superficie dei terrazzi, in metri quadri */
  mqTerrazzi?: number;
  /** @deprecated era un conteggio: le stime salvate prima del 6/9/2026 lo portano ancora; il motore lo ignora */
  balconi?: number;
  cantina?: boolean;
  box?: "nessuno" | "posto" | "box";
  /** Un box offerto a parte dall'annuncio, fuori dal prezzo dell'abitazione. `incluso`
      dice se entra nella valutazione (allora `box` vale "box"); `prezzo` e' il suo prezzo
      richiesto se e' scritto o se chi valuta lo inserisce, altrimenti null. `prezzoRichiesto`
      resta sempre e solo quello dell'abitazione: le due cifre non si sommano mai in silenzio. */
  boxSeparato?: { prezzo: number | null; incluso: boolean } | null;
  stato: Stato;
  /** il piano che il motore usa: uno di quelli quotati */
  piano: Piano;
  /** il piano vero quando non e' quotato (seminterrato, interrato). Con questo campo e senza
      `simulazionePiano` il motore rifiuta di stimare: non c'e' una valutazione attendibile. */
  pianoDichiarato?: PianoNonQuotato | null;
  /** chi valuta chiede in modo esplicito una simulazione che ipotizza il piano terra al posto
      del piano dichiarato non quotato. Il risultato porta `Stima.simulazione` e non e' una
      valutazione del piano vero. */
  simulazionePiano?: boolean;
  /** da dove viene ogni campo: annuncio, utente, ipotesi (predefinito non confermato), sconosciuto
      («non lo so»). Assente = tutto confermato (moduli precedenti al 6/9/2026, chiamate dirette).
      Vedi provenienza.ts. */
  provenienza?: Provenienze;
  /** chi valuta chiede in modo esplicito una simulazione con dati incompleti: il motore calcola con
      le ipotesi in uso e le elenca in `Stima.ipotesi`; senza questo campo, con ipotesi materiali
      non confermate, il motore rifiuta. */
  simulazioneDati?: boolean;
  ascensore: boolean;
  /** "nd": classe non conosciuta. Nessun aggiustamento, e il dettaglio lo dice; non e' una D mascherata */
  classe: Classe | "nd";
  luce?: "scarsa" | "media" | "ottima";
  epoca?: "ante1945" | "1946-1980" | "1981-2005" | "post2005" | null;
  affaccio?: "interno" | "misto" | "strada" | null;
  metro?: "vicina" | "media" | "lontana" | null;
};

export type Voce = { voce: string; effetto: number; euro: number; /** una precisazione senza numero, da mostrare comunque */ nota?: boolean };

export type Stima = {
  min: number;
  max: number;
  centro: number;
  /** il prezzo a cui, in mediana, case cosi' vengono messe in vendita: centro piu' il
      margine tipico fra richiesta e valore, misurato sugli annunci di calibrazione */
  pubblica: number;
  /** @deprecated simmetrico di `pubblica`, non e' un dato di mercato: l'interfaccia non lo usa piu' */
  offerta: number;
  superficieCommerciale: number;
  baseOmi: number;
  sigma: number;
  affidabilita: "Alta" | "Media" | "Bassa";
  /** presente quando il modello sa di essere debole (oggi: segmento di pregio) */
  avvertenza?: string;
  /** quanto del valore e' il box o posto auto (0 se non c'e'): serve a confrontare
      l'abitazione da sola quando il box e' venduto a parte */
  valoreBox: number;
  /** la sola abitazione, senza box: stessi arrotondamenti e stessa incertezza del totale */
  abitazione: { centro: number; min: number; max: number; pubblica: number };
  /** presente quando il piano dichiarato non e' quotato e chi valuta ha chiesto una
      simulazione: il risultato ipotizza `pianoIpotizzato` e non vale per il piano vero */
  simulazione?: { pianoDichiarato: PianoNonQuotato; pianoIpotizzato: Piano; testo: string };
  /** presente quando il calcolo usa dati non confermati su richiesta esplicita (simulazione con
      dati incompleti): ogni riga e' un'ipotesi in parole, da mostrare accanto al numero */
  ipotesi?: string[];
  /** predefiniti non confermati che non spostano il valore (pertinenze comprese, nessun box): non fanno
      della stima uno scenario, ma si dicono */
  noteDati?: string[];
  /** euro al metro quadro commerciale della sola abitazione: e' il numero da confrontare con le
      quotazioni OMI residenziali. Il box, se c'e', sta in `valoreBox` e non entra qui. */
  euroMq: number;
  /** euro al metro quadro con il box dentro, diviso per i soli metri dell'abitazione: non e'
      confrontabile con l'OMI, si mostra solo se serve dire quanto pesa il box */
  euroMqTotale: number;
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
