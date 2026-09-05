"use client";
import { eur, pct } from "@/lib/formato";
import type { Stima } from "@/lib/types";

/**
 * "E' caro o no?": il prezzo chiesto in un annuncio contro la stima.
 * Il confronto giusto e' con il prezzo di pubblicazione, non con il valore
 * centrale: un annuncio e' un prezzo chiesto, e chi vende chiede sempre un
 * margine per trattare. Sotto, l'offerta che la stima suggerisce.
 */
export default function AskingPrice({ richiesto, stima }: { richiesto: number; stima: Stima }) {
  const scarto = richiesto / stima.pubblica - 1;
  const dentro = Math.abs(scarto) <= stima.sigma;
  const giudizio =
    dentro ? "in linea con la stima"
    : scarto > 0.2 ? "molto sopra la stima"
    : scarto > 0 ? "sopra la stima"
    : scarto < -0.2 ? "molto sotto la stima: vale la pena capire perché"
    : "sotto la stima";

  return (
    <div className="v-asking">
      <p className="v-eyebrow">Prezzo richiesto</p>
      <p className="v-value v-value--sm">
        <span className="v-value__cur">€</span>{eur(richiesto)}
      </p>
      <p className="v-history__lead">
        <b className={scarto > stima.sigma ? "neg" : "pos"}>{scarto >= 0 ? "+" : "−"}{pct(Math.abs(scarto), 1)}</b>
        {giudizio}
      </p>
      <p className="v-body v-measure" style={{ marginTop: "var(--s-5)" }}>
        Per questa casa suggeriremmo di pubblicare a <b>{eur(stima.pubblica)} €</b>, con un valore centrale di{" "}
        {eur(stima.centro)} € e un&apos;offerta ragionevole intorno a <b>{eur(stima.offerta)} €</b>.
        {dentro
          ? " Il prezzo chiesto sta dentro l'incertezza della stima: non è un affare né un abuso, è il mercato."
          : scarto > 0
          ? " Lo scarto è più grande dell'incertezza della stima: c'è spazio per trattare, oppure la casa ha qualcosa che il modulo non vede, come una vista o un piano nobile."
          : " Un prezzo sotto la stima può essere un'occasione o un segnale: stato peggiore del dichiarato, vincoli, spese straordinarie in arrivo. Chiedi."}
      </p>
    </div>
  );
}
