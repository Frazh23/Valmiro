import { ZONE, INDICE_ISTAT, SEMESTRE, FONTE } from "./data";
import type { Input, Stima, Tipo, Stato, Voce, FasceOmi, PianoNonQuotato } from "./types";

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
  /* Superficie commerciale. La regola e' quella del DPR 138/1998, allegato C, la
     stessa del catasto: balconi, terrazze e similari comunicanti con l'abitazione
     contano al 30% fino a 25 mq e al 10% per la quota oltre; la soglia si applica
     al totale, perche' il decreto non distingue il balcone dal terrazzo, li tratta
     come una categoria sola. I muri si contano per intero (perimetrali e interni,
     fino a 50 cm) e al 50% se in comunione: da una superficie calpestabile alla
     commerciale ci passa in media il 10-15%, qui il 12%, ed e' una stima. La
     cantina resta una cifra fissa: 2,5 mq, cioe' il 25% di una cantina da 10 mq
     non comunicante, come vuole lo stesso allegato. */
  pertinenzeQuota1: 0.30,
  pertinenzeSoglia: 25,
  pertinenzeQuota2: 0.10,
  muri: 1.12,
  cantinaMq: 2.5,
  boxMq: 15,
  postoAutoSuBox: 0.55,
  /** distanza tipica fra prezzo richiesto e valore: tarata sugli annunci (vedi PARAMETRI) */
  margineTrattativa: 0.06,
} as const;

/** I tre pacchetti di ristrutturazione: il catalogo degli interventi e i costi stanno in ristrutturazione.ts. */
export const RISTRUTTURAZIONE = [
  { id: "base", nome: "Essenziale", statoDopo: "otti" as Stato },
  { id: "completa", nome: "Completa", statoDopo: "nuov" as Stato },
  { id: "design", nome: "Design", statoDopo: "nuov" as Stato },
];

/** Il costo dei lavori dipende dalla fascia: accessi, ponteggi, livello di finitura atteso. */
export const MOLTIPLICATORE_RISTRUTTURAZIONE = { B: 1.2, C: 1.08, D: 0.98, E: 0.92, R: 0.98 };

/**
 * Detrazioni edilizie 2026 (art. 16-bis TUIR, confermate dalla legge di
 * bilancio 2026): 50% sull'abitazione principale, 36% sugli altri immobili,
 * tetto 96.000 euro, dieci rate annuali. Dal 2027 scendono a 36% e 30%.
 * Da riverificare a ogni legge di bilancio.
 */
export const DETRAZIONE = { primaCasa: 0.5, altri: 0.36, tetto: 96000, rate: 10 };

/**
 * Quello che un preventivo "al metro" non dice. I costi di RISTRUTTURAZIONE sono
 * imponibili dei lavori; sopra ci vanno:
 * - IVA al 10% sui lavori (manutenzione straordinaria e ristrutturazione su
 *   abitazioni). Sui "beni significativi" — infissi, caldaia, sanitari,
 *   condizionatori — il 10% vale solo fino al valore della manodopera, il resto
 *   e' al 22%: un cantiere con molti infissi paga qualcosa in piu' di questo 10%.
 * - Spese tecniche: progetto, direzione lavori, pratica edilizia, sicurezza.
 *   Fra l'8 e il 12% dei lavori nella pratica milanese; qui il 10%. Le parcelle
 *   hanno il 4% di cassa previdenziale e l'IVA al 22%, sempre.
 * - Pratiche: diritti di segreteria della CILA o SCIA, aggiornamento catastale,
 *   attestato energetico a fine lavori. Una cifra fissa, non una percentuale.
 * Tutte queste voci entrano nella base della detrazione, fino al tetto.
 */
export const ONERI = {
  ivaLavori: 0.10,
  spesaTecnica: 0.10,
  cassaTecnici: 0.04,
  ivaTecnici: 0.22,
  pratiche: 800,
};

/**
 * Quanto vale il salto di stato conservativo.
 * L'OMI pubblica due fasce, NORMALE e OTTIMO: il rapporto tra le loro mediane e' il
 * premio che il mercato riconosce a un immobile in ordine. Preso alla lettera pero'
 * sovrastima, perche' dentro ogni fascia c'e' anche la posizione dentro la zona, che
 * non cambia ristrutturando. Lo comprimiamo con un esponente: 1 = premio pieno,
 * 0 = nessun premio.
 *
 * TARATO il 5 settembre 2026 su 201 annunci reali di Milano (data/annunci),
 * con classe energetica e civici verificati in anagrafe. Il premio andava
 * compresso di piu' in centro e semicentro (fasce B e C), dove la fascia OTTIMO
 * dell'OMI e' tirata su dal lusso e un appartamento normale ristrutturato non ci
 * arriva; in periferia (D, E) 0,70 era gia' giusto. Risultato sugli appartamenti
 * normali: errore mediano -0,2%, ogni stato entro +-4,4%, ogni fascia entro +-5%.
 * Il valore storico, 0,70 ovunque, resta come riferimento.
 */
export const COMPRESSIONE_STATO = 0.7;

/**
 * I parametri che la calibrazione puo' muovere, per fascia OMI. scripts/calibra.mjs
 * li cambia a runtime per provare valori diversi sugli annunci reali, senza
 * ricompilare e senza toccare il codice. In produzione valgono i default qui
 * sotto; cambiarli e' una decisione che passa da un commit, non da un file di
 * configurazione. R e' la fascia rurale, presente nei dati ma senza annunci.
 */
export const PARAMETRI = {
  compressioneStato: { B: 0.45, C: 0.45, D: 0.7, E: 0.7, R: 0.7 } as Record<string, number>,
  /* correzione del livello: in semicentro la mediana NORMALE dell'OMI corre sotto
     il mercato di circa il 5%, in periferia e' giusta. In centro era cosi' con le
     quotazioni 2024/2; con il 2025/2 (Brera +17%, Sempione +15%) l'OMI ha
     recuperato quasi tutto e il livello scende a 1,02: misurato il 5/9/2026
     sugli stessi 201 annunci (fascia B: mediano -3,1% con 1,05, -0,2% con 1,02). */
  livello: { B: 1.02, C: 1.05, D: 1.0, E: 1.0, R: 1.0 } as Record<string, number>,
  /* "da ristrutturare": il mercato lo prezza a -5% dal normale, non a -10% */
  scontoRist: 0.95,
  /* Segmento di pregio: sui 70 annunci "signorile" del 5/9/2026 la dispersione
     e' del 19% contro il 10% del resto, e la mediana sta +14% sopra la stima.
     Le fasce OMI "signorile" hanno un tetto che il mercato del pregio supera.
     Non si corregge il livello (l'etichetta del portale non e' la categoria
     A/1): si allarga l'intervallo e lo si dice. */
  incertezzaSig: 0.07,
};

const fasciaDi = (zona: string) => (ZONE[zona]?.f as string) || "D";

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
  const f = fasciaDi(zona);
  const premio = Math.pow(s.mediaO / s.mediaN, PARAMETRI.compressioneStato[f] ?? COMPRESSIONE_STATO);
  if (stato === "rist") return s.mediaN * PARAMETRI.scontoRist;
  if (stato === "abit") return s.mediaN;
  if (stato === "otti") return s.mediaN * premio;
  return s.mediaN * premio * 1.06;
}

/** Metri commerciali che balconi e terrazzi aggiungono, con la regola del DPR 138/98. */
export function pertinenzePonderate(mqBalconi = 0, mqTerrazzi = 0) {
  const tot = Math.max(0, mqBalconi || 0) + Math.max(0, mqTerrazzi || 0);
  return Math.min(tot, COEFF.pertinenzeSoglia) * COEFF.pertinenzeQuota1
    + Math.max(0, tot - COEFF.pertinenzeSoglia) * COEFF.pertinenzeQuota2;
}

/** La superficie commerciale scomposta: cosi' il dettaglio puo' dire da dove viene ogni metro. */
export function superficie(i: Input) {
  const calpestabile = i.superficie === "calpestabile";
  const principale = calpestabile ? i.mq * COEFF.muri : i.mq;
  const muri = principale - i.mq;
  /* Chi inserisce una commerciale presa da un annuncio o da un atto ha gia' dentro
     balconi e cantina: contarli ancora sarebbe contarli due volte. */
  const incluse = !calpestabile && i.pertinenzeIncluse !== false;
  const balconiTerrazzi = incluse ? 0 : pertinenzePonderate(i.mqBalconi, i.mqTerrazzi);
  const cantina = incluse || !i.cantina ? 0 : COEFF.cantinaMq;
  return { principale, muri, balconiTerrazzi, cantina, incluse, totale: principale + balconiTerrazzi + cantina };
}

export function superficieCommerciale(i: Input) {
  return superficie(i).totale;
}

const arrotonda = (x: number) => Math.round(x / 1000) * 1000;

/** Il messaggio con cui il motore rifiuta un piano che non quota: lo legge anche l'interfaccia. */
export const PIANO_NON_VALUTABILE = (p: PianoNonQuotato) =>
  `Per il piano ${p} non è disponibile una valutazione attendibile: le quotazioni OMI partono dal piano terra e il motore non ha un coefficiente per questo piano. Si può chiedere una simulazione che ipotizza un piano terra, sapendo che non è una valutazione del ${p}.`;

export function stima(input: Input): Stima {
  const z = ZONE[input.zona];
  if (!z) throw new Error(`Zona OMI sconosciuta: ${input.zona}`);
  if (!(input.mq > 0)) throw new Error("Superficie mancante o non valida");

  /* Un piano non quotato non si traduce in silenzio in un altro. Senza la richiesta
     esplicita di una simulazione il motore si ferma; con la richiesta, calcola come
     se fosse piano terra e lo scrive nel risultato, che non e' una valutazione del
     piano vero e non va letto come un tetto: e' un'ipotesi, non un limite dimostrato. */
  let simulazione: Stima["simulazione"];
  let i = input;
  if (input.pianoDichiarato) {
    if (!input.simulazionePiano) throw new Error(PIANO_NON_VALUTABILE(input.pianoDichiarato));
    simulazione = {
      pianoDichiarato: input.pianoDichiarato, pianoIpotizzato: "terra",
      testo: `Simulazione che ipotizza un piano terra. Il piano dichiarato è «${input.pianoDichiarato}», che il modello non quota: questo numero non è una valutazione del ${input.pianoDichiarato}, non è un tetto e non dice se il prezzo è caro o conveniente.`,
    };
    i = { ...input, piano: "terra" };
  }

  const sc = superficieCommerciale(i);
  const base = baseOmi(i.zona, i.tipo, i.stato) * INDICE_ISTAT * (PARAMETRI.livello[fasciaDi(i.zona)] ?? 1);
  const grezzo = sc * base;

  const alto = ["3-5", "6+", "ultimo"].includes(i.piano);
  const k = {
    piano: COEFF.piano[i.piano],
    ascensore: i.ascensore ? 1 : alto ? COEFF.senzaAscensoreAlto : COEFF.senzaAscensoreBasso,
    classe: i.classe === "nd" ? 1 : COEFF.classe[i.classe],
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
  const sigmaBase = Math.max(
    0.03,
    Math.min(0.13, 0.045 + dispersione * 0.35 + sigmaStato + (i.mq > 160 ? 0.015 : 0) - affinate * 0.008)
  );
  const pregio = i.tipo === "sig";
  const sigma = pregio ? Math.min(0.2, sigmaBase + PARAMETRI.incertezzaSig) : sigmaBase;
  const avvertenza = pregio
    ? "Segmento di pregio: le quotazioni ufficiali «signorile» hanno un tetto che il mercato supera regolarmente. Sugli annunci di confronto la stima è risultata bassa in mediana del 14%: prendila come punto di partenza, non come prezzo."
    : undefined;

  const voce = (nome: string, coeff: number): Voce => ({
    voce: nome, effetto: coeff - 1, euro: grezzo * (coeff - 1),
  });
  /* Lo stato conservativo sta dentro `base`: qui si separa, cosi' il dettaglio mostra
     la base della zona in stato normale e, a parte, quanto vale lo stato dichiarato. */
  const baseNormale = baseOmi(i.zona, i.tipo, "abit") * INDICE_ISTAT * (PARAMETRI.livello[fasciaDi(i.zona)] ?? 1);
  const kStato = base / baseNormale;
  const sup = superficie(i);
  const dettaglio: Voce[] = [
    { voce: `Base OMI zona ${i.zona}, stato normale · ${Math.round(sup.principale)} mq${sup.muri ? " (calpestabile più muri, 12%)" : ""}`, effetto: 0, euro: sup.principale * baseNormale },
  ];
  if (Math.abs(kStato - 1) > 1e-9) {
    const nomeStato = { rist: "da ristrutturare", abit: "abitabile", otti: "ottimo stato", nuov: "nuova" }[i.stato];
    dettaglio.push({ voce: `Stato conservativo: ${nomeStato}`, effetto: kStato - 1, euro: sup.principale * (base - baseNormale) });
  }
  if (sup.balconiTerrazzi) {
    const mq = (i.mqBalconi || 0) + (i.mqTerrazzi || 0);
    dettaglio.push({ voce: `Balconi e terrazzi · ${Math.round(mq)} mq contati al ${mq > COEFF.pertinenzeSoglia ? "30% fino a 25 e al 10% oltre" : "30%"} (DPR 138/98)`, effetto: 0, euro: sup.balconiTerrazzi * base });
  }
  if (sup.cantina) dettaglio.push({ voce: "Cantina o soffitta · 2,5 mq commerciali", effetto: 0, euro: sup.cantina * base });
  if (sup.incluse && (i.mqBalconi || i.mqTerrazzi || i.cantina)) {
    dettaglio.push({ voce: "Balconi, terrazzi e cantina già compresi nella superficie commerciale inserita", effetto: 0, euro: 0, nota: true });
  }
  dettaglio.push(
    voce(simulazione ? `Piano terra · ipotesi della simulazione, il piano dichiarato è ${simulazione.pianoDichiarato}` : `Piano ${i.piano}`, k.piano),
    voce(i.ascensore ? "Ascensore presente" : "Senza ascensore", k.ascensore),
    i.classe === "nd"
      ? { voce: "Classe energetica non dichiarata · nessun aggiustamento", effetto: 0, euro: 0, nota: true }
      : voce(`Classe energetica ${i.classe}`, k.classe),
    voce(`Luminosità ${i.luce || "media"}`, k.luce),
  );
  if (i.epoca) dettaglio.push(voce(`Epoca ${i.epoca}`, k.epoca));
  if (i.affaccio) dettaglio.push(voce(`Affaccio ${i.affaccio}`, k.affaccio));
  if (i.metro) dettaglio.push(voce(`Metropolitana ${i.metro}`, k.metro));
  if (extra) dettaglio.push({ voce: i.box === "box" ? "Box auto" : "Posto auto", effetto: 0, euro: extra });

  /* La sola abitazione: il totale meno il box, con la stessa incertezza. Serve quando il
     box e' venduto a parte e il prezzo chiesto riguarda solo la casa. */
  const soloCasa = totale - extra;

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
    avvertenza,
    valoreBox: Math.round(extra),
    abitazione: {
      centro: arrotonda(soloCasa),
      min: arrotonda(soloCasa * (1 - sigma)),
      max: arrotonda(soloCasa * (1 + sigma)),
      pubblica: arrotonda(soloCasa * (1 + COEFF.margineTrattativa)),
    },
    simulazione,
    dettaglio,
    semestre: SEMESTRE,
    fonte: FONTE,
  };
}

/* Il prospetto di ristrutturazione vive in ristrutturazione.ts, intervento per intervento. */
