"use client";
import { eur, pct } from "@/lib/formato";
import { confronto, giudizio, type Componente } from "@/lib/confronto";
import type { Input, Intento, Stima } from "@/lib/types";

/**
 * Il prezzo contro la stima, con parole diverse per chi compra e per chi vende.
 *
 * Che cosa si confronta con che cosa lo decide `confronto()` in src/lib: qui si
 * mostrano solo cifre omogenee. Se il box e' venduto a parte e il suo prezzo non
 * e' scritto, si giudica la sola abitazione e si dice che il totale non si puo'
 * confrontare; il valore stimato del box non fa mai da prezzo richiesto. Con una
 * simulazione di piano non c'e' giudizio, ne' intervallo per un'offerta.
 *
 * Quattro numeri, mai confusi fra loro:
 * - il valore stimato: il centro dell'intervallo del motore;
 * - il prezzo richiesto (chi compra) o il prezzo che si aveva in mente (chi vende):
 *   e' un'intenzione, non un valore;
 * - il prezzo di pubblicazione possibile (solo chi vende): centro piu' il 6%, una
 *   convenzione del motore allineata dalla taratura ai prezzi richiesti;
 * - l'intervallo per un'offerta (solo chi compra): la meta' bassa dell'intervallo di
 *   stima della componente confrontata.
 */
export default function AskingPrice({ input, stima, intento }: { input: Input; stima: Stima; intento: Intento }) {
  const c = confronto(input, stima);
  const P = c.principale;
  const g = giudizio(c, stima.sigma);
  const cosa = P.nome === "abitazione" ? "dell'abitazione" : "";

  /* le righe per componente, quando il box e' a parte */
  const righe = c.box && (
    <dl className="v-facts v-facts--tight" style={{ marginTop: "var(--s-5)" }}>
      <Riga nome="Abitazione" c={c.principale} sospeso={c.giudizioSospeso} />
      <Riga nome="Box venduto a parte" c={c.box} sospeso={c.giudizioSospeso} />
      {c.totale
        ? <Riga nome="Totale" c={c.totale} sospeso={c.giudizioSospeso} />
        : <div className="v-fact"><dt>Totale</dt><dd>confronto non disponibile</dd></div>}
    </dl>
  );

  if (intento === "compro") {
    if (!P.richiesto) return null;
    return (
      <div className="v-asking">
        <p className="v-eyebrow">Prezzo richiesto nell&apos;annuncio{P.nome === "abitazione" ? " · solo abitazione" : ""}</p>
        <p className="v-value v-value--sm"><span className="v-value__cur">€</span>{eur(P.richiesto)}</p>
        {g ? (
          <p className="v-history__lead">
            <b className={g.sopra && !g.dentro ? "neg" : "pos"}>{P.scarto! >= 0 ? "+" : "−"}{pct(Math.abs(P.scarto!), 1)}</b>
            {g.testo}
          </p>
        ) : (
          <p className="v-history__lead"><b>Nessun giudizio</b>: {c.motivoSospensione}</p>
        )}
        {righe}
        {c.nota && <p className="v-note" style={{ marginTop: "var(--s-4)" }}>{c.nota}</p>}
        {c.giudizioSospeso ? (
          <p className="v-body v-measure" style={{ marginTop: "var(--s-5)" }}>
            Il valore della simulazione è <b>{eur(P.valore.centro)} €</b>, fra {eur(P.valore.min)} e {eur(P.valore.max)} €, ma {c.motivoSospensione}:
            non dice se il prezzo è caro o conveniente, e non ne ricaviamo un&apos;offerta.
          </p>
        ) : (
          <>
            <p className="v-body v-measure" style={{ marginTop: "var(--s-5)" }}>
              Il valore stimato {cosa} è <b>{eur(P.valore.centro)} €</b>, in un intervallo fra {eur(P.valore.min)} e {eur(P.valore.max)} €.
              {g!.dentro
                ? " Il prezzo richiesto rientra nell'intervallo stimato: la differenza è dentro l'incertezza del modello."
                : g!.sopra
                ? " Lo scarto è più grande dell'incertezza della stima: c'è spazio per trattare, oppure la casa ha qualcosa che il modulo non vede, come una vista o un piano nobile."
                : " Un prezzo sotto la stima può essere un'occasione o un segnale: stato peggiore del dichiarato, vincoli, spese straordinarie in arrivo. Chiedi."}
            </p>
            <Offerta c={P} />
          </>
        )}
      </div>
    );
  }

  // ---- chi vende
  const sopra = P.valore.pubblica / P.valore.centro - 1;
  return (
    <div className="v-asking">
      {P.richiesto ? (
        <>
          <p className="v-eyebrow">Il prezzo che avevi in mente{P.nome === "abitazione" ? " · solo abitazione" : ""}</p>
          <p className="v-value v-value--sm"><span className="v-value__cur">€</span>{eur(P.richiesto)}</p>
          {g ? (
            <p className="v-history__lead">
              <b className={P.scarto! > stima.sigma ? "neg" : "pos"}>{P.scarto! >= 0 ? "+" : "−"}{pct(Math.abs(P.scarto!), 1)}</b>
              rispetto al valore stimato {cosa} di {eur(P.valore.centro)} €
            </p>
          ) : (
            <p className="v-history__lead"><b>Nessun giudizio</b>: {c.motivoSospensione}</p>
          )}
        </>
      ) : (
        <>
          <p className="v-eyebrow">Valore {c.giudizioSospeso ? "della simulazione" : "stimato"}{P.nome === "abitazione" ? " · solo abitazione" : ""}</p>
          <p className="v-value v-value--sm"><span className="v-value__cur">€</span>{eur(P.valore.centro)}</p>
        </>
      )}
      <dl className="v-facts v-facts--tight">
        <div className="v-fact"><dt>Valore {c.giudizioSospeso ? "della simulazione" : "stimato"}{P.nome === "abitazione" ? ", abitazione" : ""}</dt><dd>{eur(P.valore.centro)} €</dd></div>
        <div className="v-fact"><dt>Prezzo di pubblicazione possibile{P.nome === "abitazione" ? ", abitazione" : ""}</dt><dd>{c.giudizioSospeso ? "non disponibile in uno scenario" : `${eur(P.valore.pubblica)} €`}</dd></div>
      </dl>
      {righe}
      {c.nota && <p className="v-note" style={{ marginTop: "var(--s-4)" }}>{c.nota}</p>}
      <p className="v-body v-measure" style={{ marginTop: "var(--s-5)" }}>
        Sono due cose diverse. Il <b>valore stimato</b> è quanto la casa vale per il modello. Il <b>prezzo di pubblicazione
        possibile</b> è il valore più il {pct(sopra)}: una convenzione del motore che la taratura ha allineato, in mediana, ai prezzi
        richiesti dei 201 annunci milanesi usati per tararlo (settembre 2026). Non è una percentuale di trattativa misurata su
        compravendite e non è un consiglio: chi ha fretta parte più vicino al valore, chi può aspettare lascia spazio alla trattativa.
        {c.giudizioSospeso
          ? ` In uno scenario il prezzo di pubblicazione non si indica: ${c.motivoSospensione}.`
          : P.richiesto
          ? P.richiesto > P.valore.max
            ? " Il prezzo che avevi in mente è sopra il massimo dell'intervallo di stima: il rischio è restare a lungo sul mercato."
            : P.richiesto < P.valore.min
            ? " Il prezzo che avevi in mente è sotto il minimo dell'intervallo: prima di pubblicare, chiediti perché."
            : " Il prezzo che avevi in mente sta dentro l'intervallo di stima."
          : ""}
      </p>
    </div>
  );
}

/** Una componente in una riga. In una simulazione niente percentuali: sarebbero un giudizio travestito. */
function Riga({ nome, c, sospeso }: { nome: string; c: Componente; sospeso: boolean }) {
  return (
    <div className="v-fact">
      <dt>{nome}</dt>
      <dd>
        {c.richiesto ? `${eur(c.richiesto)} €` : "prezzo non indicato"} · valore {sospeso ? "simulato " : ""}{eur(c.valore.centro)} €
        {c.scarto !== null && c.nome !== "box" && !sospeso ? ` · ${c.scarto >= 0 ? "+" : "−"}${pct(Math.abs(c.scarto), 1)}` : ""}
      </dd>
    </div>
  );
}

/** L'intervallo per un'offerta, con il criterio scritto: la meta' bassa dell'intervallo della componente confrontata. */
function Offerta({ c }: { c: Componente }) {
  if (!c.richiesto) return null;
  const bassa = c.valore.min, alta = Math.min(c.valore.centro, c.richiesto);
  if (c.richiesto <= c.valore.min) {
    return (
      <p className="v-body v-measure" style={{ marginTop: "var(--s-4)" }}>
        La richiesta è già sotto il minimo dell&apos;intervallo di stima: prima di offrire di meno, verifica lo stato reale e i documenti.
      </p>
    );
  }
  return (
    <p className="v-body v-measure" style={{ marginTop: "var(--s-4)" }}>
      Un&apos;offerta {c.nome === "abitazione" ? "per la sola abitazione " : ""}fra <b>{eur(bassa)}</b> e <b>{eur(alta)} €</b> ha un criterio dietro:
      è la metà bassa dell&apos;intervallo di stima{alta < c.valore.centro ? ", fermata al prezzo richiesto" : ""}. Sotto il minimo si esce
      da ciò che il modello ritiene plausibile per questa casa; sopra il valore centrale si paga più di quanto la casa valga per il modello.
      Quanto il venditore sia disposto a scendere, il modello non lo sa.
    </p>
  );
}
