import { ZONE, INDICE_ISTAT, SEMESTRE, FONTE } from "./data";
import type { Input, Stima, Tipo, Stato, Voce, FasceOmi } from "./types";

/* --------------------------------------------------------------------------
   Motore di stima.
   Modulo puro: nessun accesso a rete o database, cosi' e' testabile e ogni
   stima e' riproducibile a partire dai soli input.
   -------------------------------------------------------------------------- */

/** Coefficienti moltiplicativi. Tenerli qui, versionati: quando cambiano, si sa quando e perche'. */
export const COEFF = {
  piano: { terra: 0.92, rialzato: 0.95, "1-2": 1.0, "3-5": 1.03, "6+": 1.06, ultimo: 1.08 },
  classe: { A: 1.1, B: 1.06, C: 1.02, D: 1.0, E: 0.98, F: 0.95, G: 0.91 },
  luce: { scarsa: 0.96, media: 1.0, ottima: 1.04 },
  epoca: { ante1945: 1.04, "1946-1980": 0.96, "1981-2005": 1.0, post2005: 1.05 },
  affaccio: { interno: 1.03, misto: 1.0, strada: 0.95 },
  metro: { vicina: 1.05, media: 1.0, lontana: 0.95 },
  /** senza ascensore: penalita' forte dal terzo piano in su */
  senzaAscensoreAlto: 0.88,
  senzaAscensoreBasso: 0.97,
  /** pesi della superficie commerciale */
  balconi: 0.25,
  cantinaMq: 2.5,
  boxMq: 15,
  postoAutoSuBox: 0.55,
  /** margini su cui si costruiscono prezzo di pubblicazione e offerta */
  margineTrattativa: 0.06,
} as const;

/** Costi di ristrutturazione a Milano, euro al mq, per livello di intervento. */
export const RISTRUTTURAZIONE = [
  { id: "base", nome: "Essenziale", euroMq: 700, statoDopo: "otti" as Stato, classeDopo: "C" as const,
    cosa: "Impianti standard, bagni completi, pavimento sovrapposto, finiture di serie." },
  { id: "completa", nome: "Completa", euroMq: 1100, statoDopo: "nuov" as Stato, classeDopo: "B" as const,
    cosa: "Demolizioni, nuovi impianti, serramenti performanti, finiture di livello." },
  { id: "design", nome: "Design", euroMq: 1500, statoDopo: "nuov" as Stato, classeDopo: "A" as const,
    cosa: "Progetto d'autore, domotica, parquet o marmo, climatizzazione canalizzata." },
];

/** Il costo dei lavori dipende dalla fascia: accessi, ponteggi, livello di finitura atteso. */
export const MOLTIPLICATORE_RISTRUTTURAZIONE = { B: 1.2, C: 1.08, D: 0.98, E: 0.92, R: 0.98 };

/** Detrazioni edilizie 2026. Da riverificare a ogni legge di bilancio. */
export const DETRAZIONE = { primaCasa: 0.5, altri: 0.36, tetto: 96000, rate: 10 };

/**
 * Quanto vale il salto di stato conservativo.
 * L'OMI pubblica due fasce, NORMALE e OTTIMO: il rapporto tra le loro mediane e' il
 * premio che il mercato riconosce a un immobile in ordine. Preso alla lettera pero'
 * sovrastima, perche' dentro ogni fascia c'e' anche la posizione dentro la zona, che
 * non cambia ristrutturando. Lo comprimiamo con un esponente: 1 = premio pieno,
 * 0 = nessun premio. PARAMETRO DA TARARE sui comparabili reali, vedi README.
 */
export const COMPRESSIONE_STATO = 0.7;

/**
 * I parametri che la calibrazione puo' muovere, in un oggetto invece che in
 * costanti sciolte: scripts/calibra.mjs li cambia a runtime per provare valori
 * diversi sugli annunci reali, senza ricompilare e senza toccare il codice.
 * In produzione valgono i default qui sotto; cambiarli e' una decisione che
 * passa da un commit, non da un file di configurazione.
 */
export const PARAMETRI = {
  compressioneStato: COMPRESSIONE_STATO,
  /** correzione globale del livello: 1 = le mediane OMI aggiornate Istat sono giuste cosi' */
  livello: 1,
};

/** Le due fasce OMI ridotte alle loro mediane, con i ripieghi per le zone incomplete. */
export function scala(zona: string, tipo: Tipo) {
  const z = ZONE[zona];
  if (!z) throw new Error(`Zona OMI sconosciuta: ${zona}`);
  let t: FasceOmi = z[tipo];
  const ripiego = !t || !Object.keys(t).length;
  if (ripiego) t = z.civ;
  const N = t.NORMALE, O = t.OTTIMO;
  const mediaN = N ? (N[0] + N[1]) / 2 : O![0] * 0.85;
  const mediaO = O ? (O[0] + O[1]) / 2 : N![1] * 1.15;
  const semiBanda = N ? (N[1] - N[0]) / 2 : (O![1] - O![0]) / 2;
  return { mediaN, mediaO, semiBanda, ripiego };
}

/** Euro al mq per lo stato dichiarato, ancorati alle mediane OMI. */
export function baseOmi(zona: string, tipo: Tipo, stato: Stato) {
  const s = scala(zona, tipo);
  const premio = Math.pow(s.mediaO / s.mediaN, PARAMETRI.compressioneStato);
  if (stato === "rist") return s.mediaN * 0.9;
  if (stato === "abit") return s.mediaN;
  if (stato === "otti") return s.mediaN * premio;
  return s.mediaN * premio * 1.06;
}

export function superficieCommerciale(i: Input) {
  return i.mq + (i.balconi || 0) * COEFF.balconi + (i.cantina ? COEFF.cantinaMq : 0);
}

const arrotonda = (x: number) => Math.round(x / 1000) * 1000;

export function stima(i: Input): Stima {
  const z = ZONE[i.zona];
  if (!z) throw new Error(`Zona OMI sconosciuta: ${i.zona}`);
  if (!(i.mq > 0)) throw new Error("Superficie mancante o non valida");

  const sc = superficieCommerciale(i);
  const base = baseOmi(i.zona, i.tipo, i.stato) * INDICE_ISTAT * PARAMETRI.livello;
  const grezzo = sc * base;

  const alto = ["3-5", "6+", "ultimo"].includes(i.piano);
  const k = {
    piano: COEFF.piano[i.piano],
    ascensore: i.ascensore ? 1 : alto ? COEFF.senzaAscensoreAlto : COEFF.senzaAscensoreBasso,
    classe: COEFF.classe[i.classe],
    luce: COEFF.luce[i.luce || "media"],
    epoca: i.epoca ? COEFF.epoca[i.epoca] : 1,
    affaccio: i.affaccio ? COEFF.affaccio[i.affaccio] : 1,
    metro: i.metro ? COEFF.metro[i.metro] : 1,
  };
  const kTot = Object.values(k).reduce((a, b) => a * b, 1);

  const boxUnit = z.box ? (z.box[0] + z.box[1]) / 2 : 1200;
  const extra =
    i.box === "box" ? boxUnit * COEFF.boxMq
    : i.box === "posto" ? boxUnit * COEFF.boxMq * COEFF.postoAutoSuBox
    : 0;

  const totale = grezzo * kTot + extra;

  /* L'incertezza non e' una costante: nasce da quanto e' larga la fascia OMI di quella
     zona, aumenta se lo stato dichiarato e' incerto e cala per ogni domanda di
     affinamento a cui l'utente ha risposto. */
  const s = scala(i.zona, i.tipo);
  const dispersione = s.semiBanda / s.mediaN;
  const sigmaStato = { rist: 0.03, abit: 0.012, otti: 0, nuov: 0 }[i.stato];
  const affinate = [i.epoca, i.affaccio, i.metro].filter(Boolean).length;
  const sigma = Math.max(
    0.03,
    Math.min(0.13, 0.045 + dispersione * 0.35 + sigmaStato + (i.mq > 160 ? 0.015 : 0) - affinate * 0.008)
  );

  const voce = (nome: string, coeff: number): Voce => ({
    voce: nome, effetto: coeff - 1, euro: grezzo * (coeff - 1),
  });
  const dettaglio: Voce[] = [
    { voce: `Base OMI zona ${i.zona}`, effetto: 0, euro: grezzo },
    voce(`Piano ${i.piano}`, k.piano),
    voce(i.ascensore ? "Ascensore presente" : "Senza ascensore", k.ascensore),
    voce(`Classe energetica ${i.classe}`, k.classe),
    voce(`Luminosita' ${i.luce || "media"}`, k.luce),
  ];
  if (i.epoca) dettaglio.push(voce(`Epoca ${i.epoca}`, k.epoca));
  if (i.affaccio) dettaglio.push(voce(`Affaccio ${i.affaccio}`, k.affaccio));
  if (i.metro) dettaglio.push(voce(`Metropolitana ${i.metro}`, k.metro));
  if (extra) dettaglio.push({ voce: i.box === "box" ? "Box auto" : "Posto auto", effetto: 0, euro: extra });

  return {
    min: arrotonda(totale * (1 - sigma)),
    max: arrotonda(totale * (1 + sigma)),
    centro: arrotonda(totale),
    pubblica: arrotonda(totale * (1 + COEFF.margineTrattativa)),
    offerta: arrotonda(totale * (1 - COEFF.margineTrattativa)),
    euroMq: totale / sc,
    superficieCommerciale: sc,
    baseOmi: base,
    sigma,
    affidabilita: sigma <= 0.075 ? "Alta" : sigma <= 0.105 ? "Media" : "Bassa",
    dettaglio,
    semestre: SEMESTRE,
    fonte: FONTE,
  };
}

/** Prospetto di ristrutturazione: costo, detrazione, valore dopo i lavori, margine. */
export function prospettoRistrutturazione(i: Input, livelloId: string, primaCasa: boolean) {
  const liv = RISTRUTTURAZIONE.find((r) => r.id === livelloId);
  if (!liv) throw new Error(`Livello sconosciuto: ${livelloId}`);
  const fascia = ZONE[i.zona].f as keyof typeof MOLTIPLICATORE_RISTRUTTURAZIONE;
  const euroMq = liv.euroMq * (MOLTIPLICATORE_RISTRUTTURAZIONE[fascia] ?? 1);
  const costo = euroMq * i.mq;
  const aliquota = primaCasa ? DETRAZIONE.primaCasa : DETRAZIONE.altri;
  const detrazione = Math.min(costo, DETRAZIONE.tetto) * aliquota;
  const prima = stima(i);
  /* Il valore dopo i lavori cambia lo stato conservativo ma NON la classe energetica:
     la fascia OTTIMO dell'OMI incorpora gia' un immobile efficiente, e applicare anche
     il coefficiente di classe conterebbe due volte lo stesso miglioramento. */
  const dopo = stima({ ...i, stato: liv.statoDopo });
  return {
    livello: liv.nome,
    euroMq,
    costo,
    detrazione,
    rate: DETRAZIONE.rate,
    costoNetto: costo - detrazione,
    valorePrima: prima.centro,
    valoreDopo: dopo.centro,
    /* La stima dopo i lavori porta la stessa incertezza di quella di partenza.
       Esporla evita che l'interfaccia mostri un punto secco piu' preciso del
       numero da cui deriva. Nessun calcolo nuovo: sono campi che stima() ha
       gia' prodotto, qui vengono solo restituiti. */
    valoreDopoMin: dopo.min,
    valoreDopoMax: dopo.max,
    sigmaDopo: dopo.sigma,
    margine: dopo.centro - prima.centro - (costo - detrazione),
  };
}
