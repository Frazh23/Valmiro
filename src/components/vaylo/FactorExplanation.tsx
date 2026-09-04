import { eur } from "@/lib/formato";
import type { Stima } from "@/lib/types";

/**
 * "Perche' vale questa cifra": le stesse voci che il motore ha gia' prodotto in
 * `stima.dettaglio`. Qui non si ricalcola niente, si mette in colonna.
 * Le voci a effetto nullo restano fuori: non spiegano nulla e fanno rumore.
 */
export default function FactorExplanation({ stima }: { stima: Stima }) {
  const [base, ...resto] = stima.dettaglio;
  const voci = resto.filter((v) => Math.round(v.euro) !== 0);

  return (
    <div className="v-factors">
      <div className="v-factor">
        <span className="v-factor__n">{base.voce}</span>
        <span className="v-factor__v">{eur(base.euro)} €</span>
      </div>
      {voci.map((v, n) => (
        <div className="v-factor" key={n}>
          <span className="v-factor__n">{v.voce}</span>
          <span className={"v-factor__v " + (v.euro > 0 ? "pos" : "neg")}>
            {v.euro > 0 ? "+" : "−"}{eur(Math.abs(v.euro))} €
          </span>
        </div>
      ))}
      <div className="v-factor v-factor--total">
        <span className="v-factor__n">Valore centrale</span>
        <span className="v-factor__v">{eur(stima.centro)} €</span>
      </div>
    </div>
  );
}
