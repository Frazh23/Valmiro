import type { Input, Stima } from "./types";

/* --------------------------------------------------------------------------
   Il prezzo contro la stima: quali cifre si possono mettere a confronto.

   Un confronto e' valido solo fra cose omogenee. Quando l'annuncio vende il box
   a parte e chi valuta lo include nel valore, il prezzo richiesto riguarda la
   sola abitazione mentre il valore stimato comprende il box: metterli uno
   contro l'altro dice che la casa e' "conveniente" del valore di un box, che e'
   falso. Qui si decide, con regole scritte, che cosa confrontare con che cosa:

   - senza box a parte, o con il box a parte non incluso: prezzo dell'abitazione
     contro valore dell'abitazione (che e' tutto il valore);
   - box a parte incluso, prezzo del box scritto: si confrontano l'abitazione con
     l'abitazione, il box con il box e il totale con il totale;
   - box a parte incluso, prezzo del box non scritto: si confronta la sola
     abitazione e si dichiara che il confronto sul totale non e' disponibile.
     Il valore stimato del box non fa mai da prezzo richiesto del box.

   Il modulo e' puro: lo usano la pagina del risultato, i riepiloghi e le stime
   salvate, e i test lo coprono direttamente.
   -------------------------------------------------------------------------- */

export type Componente = {
  nome: "abitazione" | "box" | "totale";
  richiesto: number | null;
  valore: { centro: number; min: number; max: number; pubblica: number };
  /** richiesto / centro - 1, quando il richiesto c'e' */
  scarto: number | null;
};

export type Confronto = {
  /** la componente su cui si giudica: l'abitazione quando il box e' a parte, altrimenti il totale */
  principale: Componente;
  /** presente solo con un box a parte incluso nella valutazione */
  box?: Componente;
  /** il totale abitazione + box, solo quando entrambi i prezzi sono noti */
  totale?: Componente;
  /** vero quando il box e' incluso ma il suo prezzo non e' scritto: il totale non si confronta */
  totaleNonDisponibile: boolean;
  /** con una simulazione — di piano o con dati incompleti — non si esprime nessun giudizio
      caro/conveniente, nessuna offerta, nessun prezzo di pubblicazione */
  giudizioSospeso: boolean;
  /** perche' e' sospeso, in parole, quando lo e' */
  motivoSospensione: string | null;
  /** la ragione, in parole, per chi legge */
  nota: string | null;
};

const comp = (nome: Componente["nome"], richiesto: number | null, valore: Componente["valore"]): Componente => ({
  nome, richiesto, valore,
  scarto: richiesto && valore.centro ? richiesto / valore.centro - 1 : null,
});

export function confronto(i: Input, s: Stima): Confronto {
  const richiestoCasa = i.prezzoRichiesto && i.prezzoRichiesto > 0 ? i.prezzoRichiesto : null;
  const tutto = { centro: s.centro, min: s.min, max: s.max, pubblica: s.pubblica };
  const giudizioSospeso = !!s.simulazione || !!(s.ipotesi && s.ipotesi.length);
  const motivoSospensione = !giudizioSospeso ? null
    : s.simulazione && s.ipotesi?.length ? "la simulazione ipotizza un piano terra e usa dati non confermati"
    : s.simulazione ? "la simulazione non è una valutazione del piano dichiarato"
    : "il calcolo usa dati non confermati, che sono ipotesi e non fatti";
  const boxIncluso = !!i.boxSeparato?.incluso && s.valoreBox > 0;

  if (!boxIncluso) {
    return {
      principale: comp("totale", richiestoCasa, tutto),
      totaleNonDisponibile: false,
      giudizioSospeso, motivoSospensione,
      nota: i.boxSeparato && !i.boxSeparato.incluso
        ? "Il box offerto a parte non è nella valutazione né nel prezzo: il confronto riguarda la sola abitazione."
        : null,
    };
  }

  /* Le stime salvate prima del 6/9/2026 non hanno `abitazione`: si ricava dal totale. */
  const casa = s.abitazione ?? {
    centro: s.centro - s.valoreBox, min: s.min - s.valoreBox, max: s.max - s.valoreBox, pubblica: s.pubblica - s.valoreBox,
  };
  const prezzoBox = i.boxSeparato?.prezzo && i.boxSeparato.prezzo > 0 ? i.boxSeparato.prezzo : null;
  const valoreBox = { centro: s.valoreBox, min: s.valoreBox, max: s.valoreBox, pubblica: s.valoreBox };
  const principale = comp("abitazione", richiestoCasa, casa);
  const box = comp("box", prezzoBox, valoreBox);

  if (prezzoBox && richiestoCasa) {
    return {
      principale, box,
      totale: comp("totale", richiestoCasa + prezzoBox, tutto),
      totaleNonDisponibile: false,
      giudizioSospeso, motivoSospensione,
      nota: "Il box è venduto a parte: abitazione, box e totale sono confrontati ciascuno con il proprio valore.",
    };
  }
  return {
    principale, box,
    totaleNonDisponibile: true,
    giudizioSospeso, motivoSospensione,
    nota: prezzoBox
      ? "Il box è venduto a parte e ha un prezzo; manca quello dell'abitazione, quindi il totale non si confronta."
      : "Il box è venduto a parte e l'annuncio non ne scrive il prezzo: il confronto è sulla sola abitazione. Per confrontare il totale inserisci il prezzo del box. Il suo valore stimato non fa da prezzo.",
  };
}

/** Il giudizio in parole sullo scarto della componente principale; nessuno se sospeso. */
export function giudizio(c: Confronto, sigma: number): { testo: string; dentro: boolean; sopra: boolean } | null {
  const sc = c.principale.scarto;
  if (c.giudizioSospeso || sc === null) return null;
  const dentro = Math.abs(sc) <= sigma;
  const testo =
    dentro ? "dentro l'intervallo di stima"
    : sc > 0.2 ? "molto sopra il valore stimato"
    : sc > 0 ? "sopra il valore stimato"
    : sc < -0.2 ? "molto sotto il valore stimato: vale la pena capire perché"
    : "sotto il valore stimato";
  return { testo, dentro, sopra: sc > 0 };
}
