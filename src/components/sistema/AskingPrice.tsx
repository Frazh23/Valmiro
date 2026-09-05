"use client";
import { eur, pct } from "@/lib/formato";
import type { Intento, Stima } from "@/lib/types";

/**
 * Il prezzo contro la stima, con parole diverse per chi compra e per chi vende.
 *
 * Quattro numeri, mai confusi fra loro:
 * - il valore stimato: il centro dell'intervallo del motore;
 * - il prezzo richiesto (chi compra) o il prezzo che si aveva in mente (chi vende):
 *   e' un'intenzione, non un valore;
 * - il prezzo di pubblicazione possibile (solo chi vende): il prezzo a cui, in
 *   mediana, case cosi' sono messe in vendita negli annunci con cui il motore e'
 *   stato tarato — una misura del comportamento dei venditori, non un consiglio;
 * - l'intervallo per un'offerta (solo chi compra): la meta' bassa dell'intervallo
 *   di stima. Il criterio e' quello e non un altro: sotto il minimo si esce da
 *   cio' che il modello ritiene plausibile, sopra il centro si paga piu' del valore.
 */
export default function AskingPrice({ richiesto, stima, intento }: { richiesto: number | null; stima: Stima; intento: Intento }) {
  const centro = stima.centro;

  if (intento === "compro") {
    if (!richiesto) return null;
    const scarto = richiesto / centro - 1;
    const dentro = Math.abs(scarto) <= stima.sigma;
    const giudizio =
      dentro ? "dentro l'intervallo di stima"
      : scarto > 0.2 ? "molto sopra il valore stimato"
      : scarto > 0 ? "sopra il valore stimato"
      : scarto < -0.2 ? "molto sotto il valore stimato: vale la pena capire perché"
      : "sotto il valore stimato";
    const offertaBassa = stima.min, offertaAlta = Math.min(centro, richiesto);
    const offertaSensata = richiesto > stima.min;
    return (
      <div className="v-asking">
        <p className="v-eyebrow">Prezzo richiesto nell&apos;annuncio</p>
        <p className="v-value v-value--sm"><span className="v-value__cur">€</span>{eur(richiesto)}</p>
        <p className="v-history__lead">
          <b className={scarto > stima.sigma ? "neg" : "pos"}>{scarto >= 0 ? "+" : "−"}{pct(Math.abs(scarto), 1)}</b>{" "}
          {giudizio}
        </p>
        <p className="v-body v-measure" style={{ marginTop: "var(--s-5)" }}>
          Il valore stimato è <b>{eur(centro)} €</b>, in un intervallo fra {eur(stima.min)} e {eur(stima.max)} €.
          {dentro
            ? " La richiesta sta dentro l'incertezza della stima: non è un affare né un abuso, è il mercato."
            : scarto > 0
            ? " Lo scarto è più grande dell'incertezza della stima: c'è spazio per trattare, oppure la casa ha qualcosa che il modulo non vede, come una vista o un piano nobile."
            : " Un prezzo sotto la stima può essere un'occasione o un segnale: stato peggiore del dichiarato, vincoli, spese straordinarie in arrivo. Chiedi."}
        </p>
        {offertaSensata ? (
          <p className="v-body v-measure" style={{ marginTop: "var(--s-4)" }}>
            Un&apos;offerta fra <b>{eur(offertaBassa)}</b> e <b>{eur(offertaAlta)} €</b> ha un criterio dietro: è la metà bassa
            dell&apos;intervallo di stima{offertaAlta < centro ? ", fermata al prezzo richiesto" : ""}. Sotto il minimo si esce da ciò che il
            modello ritiene plausibile per questa casa; sopra il valore centrale si paga più di quanto la casa valga per il modello.
            Quanto il venditore sia disposto a scendere, il modello non lo sa.
          </p>
        ) : (
          <p className="v-body v-measure" style={{ marginTop: "var(--s-4)" }}>
            La richiesta è già sotto il minimo dell&apos;intervallo di stima: prima di offrire di meno, verifica lo stato reale e i documenti.
          </p>
        )}
      </div>
    );
  }

  // ---- chi vende
  const pubblica = stima.pubblica;
  const sopra = pubblica / centro - 1;
  return (
    <div className="v-asking">
      {richiesto ? (
        <>
          <p className="v-eyebrow">Il prezzo che avevi in mente</p>
          <p className="v-value v-value--sm"><span className="v-value__cur">€</span>{eur(richiesto)}</p>
          <p className="v-history__lead">
            <b className={richiesto / centro - 1 > stima.sigma ? "neg" : "pos"}>{richiesto >= centro ? "+" : "−"}{pct(Math.abs(richiesto / centro - 1), 1)}</b>{" "}
            rispetto al valore stimato di {eur(centro)} €
          </p>
        </>
      ) : (
        <>
          <p className="v-eyebrow">Prezzo di pubblicazione possibile</p>
          <p className="v-value v-value--sm"><span className="v-value__cur">€</span>{eur(pubblica)}</p>
          <p className="v-history__lead"><b className="pos">+{pct(sopra)}</b>{" "}sopra il valore stimato di {eur(centro)} €</p>
        </>
      )}
      {richiesto ? (
        <dl className="v-facts v-facts--tight">
          <div className="v-fact"><dt>Valore stimato</dt><dd>{eur(centro)} €</dd></div>
          <div className="v-fact"><dt>Prezzo di pubblicazione possibile</dt><dd>{eur(pubblica)} €</dd></div>
        </dl>
      ) : null}
      <p className="v-body v-measure" style={{ marginTop: "var(--s-5)" }}>
        Sono due cose diverse. Il <b>valore stimato</b> è quanto la casa vale per il modello. Il <b>prezzo di pubblicazione
        possibile</b> è il prezzo a cui, in mediana, case come questa vengono messe in vendita: il {pct(sopra)} sopra il valore,
        cioè la distanza tipica fra richiesta e valore misurata sui 201 annunci milanesi con cui il motore è stato tarato
        (settembre 2026). È una misura di come si comportano i venditori, non un consiglio: chi ha fretta parte più vicino al valore,
        chi può aspettare lascia spazio alla trattativa.
        {richiesto
          ? richiesto > stima.max
            ? " Il prezzo che avevi in mente è sopra il massimo dell'intervallo di stima: il rischio è restare a lungo sul mercato."
            : richiesto < stima.min
            ? " Il prezzo che avevi in mente è sotto il minimo dell'intervallo: prima di pubblicare, chiediti perché."
            : " Il prezzo che avevi in mente sta dentro l'intervallo di stima."
          : ""}
      </p>
    </div>
  );
}
